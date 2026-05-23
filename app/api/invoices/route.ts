import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type CurrentSession = {
  id?: string;
  email?: string;
  role?: string;
  company_id?: string;
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
  created_at: string | null;
  updated_at: string | null;
};

type InvoiceStatsRow = {
  total_invoices: string | number | null;
  total_spend: string | number | null;
  needs_review: string | number | null;
  confirmed: string | number | null;
};

type InvoiceResponse = {
  id: string;
  companyId: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paidAt: string;
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;
  updatedAt: string;
};

type CreateInvoiceBody = {
  vendorName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  status?: string;
};

type InvoicesApiResponse = {
  success: boolean;
  companyId?: string;
  invoices: InvoiceResponse[];
  stats: {
    totalInvoices: number;
    totalSpend: number;
    needsReview: number;
    confirmed: number;
  };
  error?: string;
};

type CreateInvoiceResponse = {
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

  return "Failed to load invoices";
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function formatInvoice(row: InvoiceRow): InvoiceResponse {
  return {
    id: row.id,
    companyId: row.company_id,
    vendorName: row.vendor_name ?? "Unknown Vendor",
    invoiceNumber: row.invoice_number ?? "-",
    invoiceDate: row.invoice_date ?? "",
    totalAmount: toNumber(row.total_amount),
    status: row.status ?? "needs_review",
    paymentStatus: row.payment_status ?? "unpaid",
    paidAt: row.paid_at ?? "",
    paymentMethod: row.payment_method ?? "",
    paymentReference: row.payment_reference ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function getSessionCompanyId(request: NextRequest): string {
  const session = getSessionFromRequest(request) as CurrentSession | null;

  if (!session?.company_id) {
    throw new Error("Unauthorized: missing company_id");
  }

  return session.company_id;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<InvoicesApiResponse>> {
  try {
    const companyId = getSessionCompanyId(request);

    const invoices = await sql<InvoiceRow[]>`
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
        payment_method,
        payment_reference,
        created_at,
        updated_at
      FROM invoices
      WHERE company_id = ${companyId}
      ORDER BY created_at DESC NULLS LAST
      LIMIT 100
    `;

    const statsRows = await sql<InvoiceStatsRow[]>`
      SELECT
        COUNT(*) AS total_invoices,
        COALESCE(SUM(total_amount), 0) AS total_spend,
        COUNT(*) FILTER (
          WHERE status IN ('needs_review', 'review', 'draft')
        ) AS needs_review,
        COUNT(*) FILTER (
          WHERE status IN ('confirmed', 'processed')
        ) AS confirmed
      FROM invoices
      WHERE company_id = ${companyId}
    `;

    const stats = statsRows[0];

    return NextResponse.json({
      success: true,
      companyId,
      invoices: invoices.map(formatInvoice),
      stats: {
        totalInvoices: toNumber(stats?.total_invoices),
        totalSpend: toNumber(stats?.total_spend),
        needsReview: toNumber(stats?.needs_review),
        confirmed: toNumber(stats?.confirmed),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        invoices: [],
        stats: {
          totalInvoices: 0,
          totalSpend: 0,
          needsReview: 0,
          confirmed: 0,
        },
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateInvoiceResponse>> {
  try {
    const companyId = getSessionCompanyId(request);
    const body = (await request.json()) as CreateInvoiceBody;

    const vendorName = body.vendorName?.trim() || "Manual Vendor";
    const invoiceNumber = body.invoiceNumber?.trim() || "";
    const invoiceDate = body.invoiceDate?.trim() || new Date().toISOString().slice(0, 10);
    const totalAmount =
      typeof body.totalAmount === "number" && Number.isFinite(body.totalAmount)
        ? body.totalAmount
        : 0;
    const status = body.status?.trim() || "needs_review";

    const insertedRows = await sql<InvoiceRow[]>`
      INSERT INTO invoices (
        company_id,
        vendor_name,
        invoice_number,
        invoice_date,
        total_amount,
        status,
        payment_status,
        created_at,
        updated_at
      )
      VALUES (
        ${companyId},
        ${vendorName},
        ${invoiceNumber},
        ${invoiceDate},
        ${totalAmount}::numeric,
        ${status},
        'unpaid',
        NOW(),
        NOW()
      )
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
        created_at,
        updated_at
    `;

    return NextResponse.json({
      success: true,
      invoice: formatInvoice(insertedRows[0]),
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