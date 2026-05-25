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
  companyId?: string;
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
  vendor_name?: string;
  invoiceNumber?: string;
  invoice_number?: string;
  trackingNumber?: string;
  tracking_number?: string;
  invoiceDate?: string;
  invoice_date?: string;
  totalAmount?: number | string;
  total_amount?: number | string;
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
  duplicateInvoiceId?: string;
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

function isDuplicateInvoiceError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const errorObject = error as {
    code?: unknown;
    constraint_name?: unknown;
    constraint?: unknown;
    message?: unknown;
  };

  const code = typeof errorObject.code === "string" ? errorObject.code : "";
  const constraintName =
    typeof errorObject.constraint_name === "string"
      ? errorObject.constraint_name
      : typeof errorObject.constraint === "string"
        ? errorObject.constraint
        : "";
  const message =
    typeof errorObject.message === "string" ? errorObject.message : "";

  return (
    code === "23505" ||
    constraintName.includes("invoices_company_vendor_invoice_unique") ||
    message.includes("invoices_company_vendor_invoice_unique")
  );
}

function cleanText(value: string | null | undefined): string {
  return value?.trim() ?? "";
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

function makeFinalInvoiceNumber(
  invoiceNumber: string,
  trackingNumber: string,
): string {
  if (invoiceNumber) {
    return invoiceNumber;
  }

  if (trackingNumber) {
    return `TRACK-${trackingNumber.replace(/^TRACK-/i, "")}`;
  }

  return `MANUAL-${Date.now()}`;
}

async function getSessionCompanyId(request: NextRequest): Promise<string> {
  const session = (await getSessionFromRequest(request)) as CurrentSession | null;
  const companyId = session?.companyId ?? session?.company_id ?? "";

  if (!companyId) {
    throw new Error("Unauthorized: missing company_id");
  }

  return companyId;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<InvoicesApiResponse>> {
  try {
    const companyId = await getSessionCompanyId(request);

    const invoices = await sql<InvoiceRow[]>`
      SELECT
        id::text,
        company_id::text,
        vendor_name,
        invoice_number,
        invoice_date::text,
        total_amount,
        status,
        payment_status,
        paid_at::text,
        payment_method,
        payment_reference,
        created_at::text,
        updated_at::text
      FROM invoices
      WHERE company_id::text = ${companyId}
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
      WHERE company_id::text = ${companyId}
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
    const companyId = await getSessionCompanyId(request);
    const body = (await request.json()) as CreateInvoiceBody;

    const vendorName =
      cleanText(body.vendorName) || cleanText(body.vendor_name) || "Manual Vendor";
    const rawInvoiceNumber =
      cleanText(body.invoiceNumber) || cleanText(body.invoice_number);
    const trackingNumber =
      cleanText(body.trackingNumber) || cleanText(body.tracking_number);
    const finalInvoiceNumber = makeFinalInvoiceNumber(
      rawInvoiceNumber,
      trackingNumber,
    );
    const invoiceDate =
      cleanText(body.invoiceDate) ||
      cleanText(body.invoice_date) ||
      new Date().toISOString().slice(0, 10);
    const totalAmount =
      toNumber(body.totalAmount) > 0
        ? toNumber(body.totalAmount)
        : toNumber(body.total_amount);
    const status = cleanText(body.status) || "needs_review";

    const duplicateRows = await sql<{ id: string }[]>`
      SELECT id::text
      FROM invoices
      WHERE company_id::text = ${companyId}
        AND LOWER(TRIM(vendor_name)) = LOWER(TRIM(${vendorName}))
        AND TRIM(invoice_number) = TRIM(${finalInvoiceNumber})
        AND TRIM(invoice_number) <> ''
      LIMIT 1
    `;

    if (duplicateRows[0]) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate invoice: this vendor invoice number already exists.",
          duplicateInvoiceId: duplicateRows[0].id,
        },
        { status: 409 },
      );
    }

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
        ${finalInvoiceNumber},
        ${invoiceDate},
        ${totalAmount}::numeric,
        ${status},
        'unpaid',
        NOW(),
        NOW()
      )
      RETURNING
        id::text,
        company_id::text,
        vendor_name,
        invoice_number,
        invoice_date::text,
        total_amount,
        status,
        payment_status,
        paid_at::text,
        payment_method,
        payment_reference,
        created_at::text,
        updated_at::text
    `;

    return NextResponse.json({
      success: true,
      invoice: formatInvoice(insertedRows[0]),
    });
  } catch (error: unknown) {
    if (isDuplicateInvoiceError(error)) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate invoice: this vendor invoice number already exists.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}