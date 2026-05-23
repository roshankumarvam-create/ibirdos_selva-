import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getCurrentUser } from "@/app/lib/currentUser";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

type RouteContext = {
  params: Promise<{
    invoiceId: string;
    lineId: string;
  }>;
};

type UpdateInvoiceLineBody = {
  itemName?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  lineTotal?: number;
};

type InvoiceLineRow = {
  id: string;
  invoice_id: string;
  ingredient_id: string | null;
  item_name: string | null;
  description: string | null;
  quantity: string | number | null;
  unit: string | null;
  unit_price: string | number | null;
  line_total: string | number | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type InvoiceLineResponse = {
  id: string;
  invoiceId: string;
  ingredientId: string | null;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown invoice line update error";
}

function toNumber(value: string | number | null): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function cleanText(value: string | undefined, fallback: string): string {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function formatInvoiceLine(row: InvoiceLineRow): InvoiceLineResponse {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    ingredientId: row.ingredient_id,
    itemName: row.item_name ?? "Unknown Item",
    description: row.description ?? "",
    quantity: toNumber(row.quantity),
    unit: row.unit ?? "",
    unitPrice: toNumber(row.unit_price),
    lineTotal: toNumber(row.line_total),
    status: row.status ?? "needs_review",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = (await getCurrentUser()) as CurrentUser | null;

  if (!currentUser?.company_id) {
    throw new Error("Unauthorized: missing company_id");
  }

  return currentUser;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await requireCurrentUser();
    const { invoiceId, lineId } = await context.params;
    const body = (await request.json()) as UpdateInvoiceLineBody;

    const itemName = cleanText(body.itemName, "Unknown Item");
    const description = body.description?.trim() ?? "";
    const quantity =
      typeof body.quantity === "number" && Number.isFinite(body.quantity)
        ? body.quantity
        : 0;
    const unit = cleanText(body.unit, "unit");
    const unitPrice =
      typeof body.unitPrice === "number" && Number.isFinite(body.unitPrice)
        ? body.unitPrice
        : 0;

    const calculatedLineTotal = Number((quantity * unitPrice).toFixed(2));
    const lineTotal =
      typeof body.lineTotal === "number" && Number.isFinite(body.lineTotal)
        ? body.lineTotal
        : calculatedLineTotal;

    const updatedRows = await sql<InvoiceLineRow[]>`
      UPDATE invoice_lines
      SET
        item_name = ${itemName},
        description = ${description},
        quantity = ${quantity},
        unit = ${unit},
        unit_price = ${unitPrice},
        line_total = ${lineTotal},
        status = 'needs_review',
        updated_at = NOW()
      WHERE id = ${lineId}
      AND invoice_id = ${invoiceId}
      AND company_id = ${currentUser.company_id}
      RETURNING
        id,
        invoice_id,
        ingredient_id,
        item_name,
        description,
        quantity,
        unit,
        unit_price,
        line_total,
        status,
        created_at,
        updated_at
    `;

    const line = updatedRows[0];

    if (!line) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice line not found",
        },
        { status: 404 },
      );
    }

    await sql`
      UPDATE invoices
      SET
        total_amount = COALESCE((
          SELECT SUM(line_total)
          FROM invoice_lines
          WHERE invoice_id = ${invoiceId}
          AND company_id = ${currentUser.company_id}
        ), 0),
        status = 'needs_review',
        updated_at = NOW()
      WHERE id = ${invoiceId}
      AND company_id = ${currentUser.company_id}
    `;

    return NextResponse.json({
      success: true,
      line: formatInvoiceLine(line),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}