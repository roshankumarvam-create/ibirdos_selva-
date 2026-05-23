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
  }>;
};

type MarkPaidBody = {
  paymentMethod?: string;
  paymentReference?: string;
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
  payment_method: string | null;
  payment_reference: string | null;
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
  paymentMethod: string;
  paymentReference: string;
  updatedAt: string;
};

type MarkPaidResponse = {
  success: boolean;
  invoice?: InvoiceResponse;
  error?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown mark paid error";
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

function formatInvoice(row: InvoiceRow): InvoiceResponse {
  return {
    id: row.id,
    vendorName: row.vendor_name ?? "Unknown Vendor",
    invoiceNumber: row.invoice_number ?? "",
    invoiceDate: row.invoice_date ?? "",
    totalAmount: toNumber(row.total_amount),
    status: row.status ?? "confirmed",
    paymentStatus: row.payment_status ?? "paid",
    paidAt: row.paid_at ?? "",
    paymentMethod: row.payment_method ?? "manual",
    paymentReference: row.payment_reference ?? "",
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

async function readBody(request: NextRequest): Promise<MarkPaidBody> {
  const text = await request.text();

  if (!text.trim()) {
    return {};
  }

  const parsed = JSON.parse(text) as Partial<MarkPaidBody>;

  return {
    paymentMethod:
      typeof parsed.paymentMethod === "string" ? parsed.paymentMethod : undefined,
    paymentReference:
      typeof parsed.paymentReference === "string"
        ? parsed.paymentReference
        : undefined,
  };
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<MarkPaidResponse>> {
  try {
    const currentUser = await requireCurrentUser();
    const { invoiceId } = await context.params;
    const body = await readBody(request);

    const paymentMethod = body.paymentMethod?.trim() || "manual";
    const paymentReference = body.paymentReference?.trim() || "";

    const updatedRows = await sql<InvoiceRow[]>`
      UPDATE invoices
      SET
        payment_status = 'paid',
        paid_at = NOW(),
        payment_method = ${paymentMethod},
        payment_reference = ${paymentReference},
        updated_at = NOW()
      WHERE id = ${invoiceId}
      AND company_id = ${currentUser.company_id}
      RETURNING
        id,
        company_id,
        vendor_name,
        invoice_number,
        invoice_date,
        total_amount,
        status,
        payment_status,
        paid_at,
        payment_method,
        payment_reference,
        updated_at
    `;

    const invoice = updatedRows[0];

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      invoice: formatInvoice(invoice),
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