import { NextResponse } from "next/server";
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
  }>;
};

type InvoiceRow = {
  id: string;
  company_id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: string | number | null;
  status: string | null;
  payment_status: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
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
  category: string | null;
  raw_ocr_text: string | null;
  review_note: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type InvoiceResponse = {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
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
  category: string;
  rawOcrText: string;
  reviewNote: string;
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

  return "Unknown invoice detail API error";
}

function toNumber(value: string | number | null): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeCategory(value: string | null): string {
  if (
    value === "food_ingredient" ||
    value === "packaging_supplies" ||
    value === "labor_service" ||
    value === "delivery_freight" ||
    value === "ignore"
  ) {
    return value;
  }

  return "food_ingredient";
}

function formatInvoice(row: InvoiceRow): InvoiceResponse {
  return {
    id: row.id,
    vendorName: row.vendor_name ?? "Unknown Vendor",
    invoiceNumber: row.invoice_number ?? "",
    invoiceDate: row.invoice_date ?? "",
    totalAmount: toNumber(row.total_amount),
    status: row.status ?? "needs_review",
    paymentStatus: row.payment_status ?? "unpaid",
    paidAt: row.paid_at ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
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
    category: normalizeCategory(row.category),
    rawOcrText: row.raw_ocr_text ?? "",
    reviewNote: row.review_note ?? "",
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

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await requireCurrentUser();
    const { invoiceId } = await context.params;

    const invoiceRows = await sql<InvoiceRow[]>`
      SELECT
        id,
        company_id,
        vendor_name,
        invoice_number,
        invoice_date,
        total_amount,
        status,
        payment_status,
        paid_at,
        created_at,
        updated_at
      FROM invoices
      WHERE id = ${invoiceId}
      AND company_id = ${currentUser.company_id}
      LIMIT 1
    `;

    const invoice = invoiceRows[0];

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice not found",
        },
        { status: 404 },
      );
    }

    const lineRows = await sql<InvoiceLineRow[]>`
      SELECT
        id,
        invoice_id,
        ingredient_id,
        item_name,
        description,
        quantity,
        unit,
        unit_price,
        line_total,
        category,
        raw_ocr_text,
        review_note,
        status,
        created_at,
        updated_at
      FROM invoice_lines
      WHERE invoice_id = ${invoiceId}
      AND company_id = ${currentUser.company_id}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      success: true,
      invoice: formatInvoice(invoice),
      lines: lineRows.map(formatInvoiceLine),
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