import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getCurrentUser } from "@/app/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type DateValue = string | Date | null;

type CurrentUser = {
  id?: string;
  email?: string;
  role?: string;
  company_id?: string;
  companyId?: string;
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
  invoice_date: DateValue;
  total_amount: string | number | null;
  status: string | null;
  payment_status: string | null;
  paid_at: DateValue;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: DateValue;
  updated_at: DateValue;
};

type InvoiceLineRow = {
  id: string;
  company_id: string;
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
  created_at: DateValue;
  updated_at: DateValue;
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

type InvoiceLineResponse = {
  id: string;
  companyId: string;
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

type InvoiceLineInput = {
  itemName?: string;
  item_name?: string;
  description?: string;
  quantity?: number | string;
  unit?: string;
  unitPrice?: number | string;
  unit_price?: number | string;
  lineTotal?: number | string;
  line_total?: number | string;
  category?: string;
  rawOcrText?: string;
  raw_ocr_text?: string;
  reviewNote?: string;
  review_note?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Invoice detail API error";
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%\s,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toText(value: DateValue): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value ?? "";
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeCategory(value: unknown): string {
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
    companyId: row.company_id,
    vendorName: row.vendor_name ?? "Unknown Vendor",
    invoiceNumber: row.invoice_number ?? "-",
    invoiceDate: toText(row.invoice_date),
    totalAmount: toNumber(row.total_amount),
    status: row.status ?? "needs_review",
    paymentStatus: row.payment_status ?? "unpaid",
    paidAt: toText(row.paid_at),
    paymentMethod: row.payment_method ?? "",
    paymentReference: row.payment_reference ?? "",
    createdAt: toText(row.created_at),
    updatedAt: toText(row.updated_at),
  };
}

function formatInvoiceLine(row: InvoiceLineRow): InvoiceLineResponse {
  return {
    id: row.id,
    companyId: row.company_id,
    invoiceId: row.invoice_id,
    ingredientId: row.ingredient_id,
    itemName: row.item_name ?? "Unknown Item",
    description: row.description ?? "",
    quantity: toNumber(row.quantity),
    unit: row.unit ?? "each",
    unitPrice: toNumber(row.unit_price),
    lineTotal: toNumber(row.line_total),
    category: normalizeCategory(row.category),
    rawOcrText: row.raw_ocr_text ?? "",
    reviewNote: row.review_note ?? "",
    status: row.status ?? "needs_review",
    createdAt: toText(row.created_at),
    updatedAt: toText(row.updated_at),
  };
}

async function getCompanyId(): Promise<string> {
  const currentUser = (await getCurrentUser()) as CurrentUser | null;
  const companyId = currentUser?.company_id ?? currentUser?.companyId ?? "";

  if (!companyId) {
    throw new Error("Unauthorized: missing company_id");
  }

  return companyId;
}

  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      vendor_name TEXT,
      invoice_number TEXT,
      invoice_date DATE,
      total_amount NUMERIC NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'needs_review',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      paid_at TIMESTAMPTZ,
      payment_method TEXT,
      payment_reference TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS vendor_name TEXT,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS invoice_date DATE,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'needs_review',
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS payment_reference TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      invoice_id UUID NOT NULL,
      ingredient_id UUID,
      item_name TEXT,
      description TEXT,
      quantity NUMERIC NOT NULL DEFAULT 0,
      unit TEXT,
      unit_price NUMERIC NOT NULL DEFAULT 0,
      line_total NUMERIC NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'food_ingredient',
      raw_ocr_text TEXT,
      review_note TEXT,
      status TEXT NOT NULL DEFAULT 'needs_review',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE invoice_lines
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS invoice_id UUID,
    ADD COLUMN IF NOT EXISTS ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS item_name TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit TEXT,
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'food_ingredient',
    ADD COLUMN IF NOT EXISTS raw_ocr_text TEXT,
    ADD COLUMN IF NOT EXISTS review_note TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'needs_review',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_invoice_lines_company_invoice
    ON invoice_lines(company_id, invoice_id);
  `;
  
async function ensureInvoiceTables(): Promise<void> { 
  return;
} 

async function getInvoice(
  invoiceId: string,
  companyId: string,
): Promise<InvoiceRow | null> {
  const rows = await sql<InvoiceRow[]>`
    SELECT
      id::text,
      company_id::text,
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
    WHERE id::text = ${invoiceId}
      AND company_id::text = ${companyId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getInvoiceLines(
  invoiceId: string,
  companyId: string,
): Promise<InvoiceLineRow[]> {
  return sql<InvoiceLineRow[]>`
    SELECT
      id::text,
      company_id::text,
      invoice_id::text,
      ingredient_id::text,
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
    WHERE invoice_id::text = ${invoiceId}
      AND company_id::text = ${companyId}
    ORDER BY created_at ASC NULLS LAST
  `;
}

async function createInvoiceLine(
  companyId: string,
  invoiceId: string,
  line: InvoiceLineInput,
): Promise<InvoiceLineRow> {
  const itemName =
    cleanText(line.itemName ?? line.item_name) || "Invoice total review line";
  const quantity = toNumber(line.quantity) || 1;
  const unitPrice = toNumber(line.unitPrice ?? line.unit_price);
  const incomingLineTotal = toNumber(line.lineTotal ?? line.line_total);
  const lineTotal =
    incomingLineTotal > 0 ? incomingLineTotal : quantity * unitPrice;

  const rows = await sql<InvoiceLineRow[]>`
    INSERT INTO invoice_lines (
      company_id,
      invoice_id,
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
    )
    VALUES (
      ${companyId},
      ${invoiceId},
      ${itemName},
      ${cleanText(line.description)},
      ${quantity}::numeric,
      ${cleanText(line.unit) || "invoice"},
      ${unitPrice}::numeric,
      ${lineTotal}::numeric,
      ${normalizeCategory(line.category)},
      ${cleanText(line.rawOcrText ?? line.raw_ocr_text)},
      ${cleanText(line.reviewNote ?? line.review_note)},
      'needs_review',
      NOW(),
      NOW()
    )
    RETURNING
      id::text,
      company_id::text,
      invoice_id::text,
      ingredient_id::text,
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
  `;

  return rows[0];
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await ensureInvoiceTables();

    const companyId = await getCompanyId();
    const { invoiceId } = await context.params;

    const invoice = await getInvoice(invoiceId, companyId);

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          invoice: null,
          lines: [],
          data: [],
          error: "Invoice not found",
        },
        { status: 404 },
      );
    }

    let lineRows = await getInvoiceLines(invoiceId, companyId);

    if (lineRows.length === 0 && toNumber(invoice.total_amount) > 0) {
      const fallbackLine = await createInvoiceLine(companyId, invoiceId, {
        itemName: "Invoice total review line",
        description: "Auto-created because this invoice had no saved lines.",
        quantity: 1,
        unit: "invoice",
        unitPrice: toNumber(invoice.total_amount),
        lineTotal: toNumber(invoice.total_amount),
        category: "food_ingredient",
      });

      lineRows = [fallbackLine];
    }

    return NextResponse.json({
      success: true,
      invoice: formatInvoice(invoice),
      lines: lineRows.map(formatInvoiceLine),
      data: lineRows.map(formatInvoiceLine),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        invoice: null,
        lines: [],
        data: [],
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await ensureInvoiceTables();

    const companyId = await getCompanyId();
    const { invoiceId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = cleanText(body.action);

    const invoice = await getInvoice(invoiceId, companyId);

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice not found",
        },
        { status: 404 },
      );
    }

    if (action === "mark_paid" || action === "markPaid" || action === "paid") {
      const paymentMethod = cleanText(body.paymentMethod) || "manual";
      const paymentReference = cleanText(body.paymentReference);

      const rows = await sql<InvoiceRow[]>`
        UPDATE invoices
        SET
          payment_status = 'paid',
          paid_at = NOW(),
          payment_method = ${paymentMethod},
          payment_reference = ${paymentReference},
          updated_at = NOW()
        WHERE id::text = ${invoiceId}
          AND company_id::text = ${companyId}
        RETURNING
          id::text,
          company_id::text,
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
        invoice: formatInvoice(rows[0]),
      });
    }

    if (action === "confirm") {
      const lineRows = await sql<InvoiceLineRow[]>`
        UPDATE invoice_lines
        SET
          status = CASE
            WHEN category = 'ignore' THEN 'ignored'
            ELSE 'processed'
          END,
          updated_at = NOW()
        WHERE invoice_id::text = ${invoiceId}
          AND company_id::text = ${companyId}
        RETURNING
          id::text,
          company_id::text,
          invoice_id::text,
          ingredient_id::text,
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
      `;

      const invoiceRows = await sql<InvoiceRow[]>`
        UPDATE invoices
        SET
          status = 'confirmed',
          updated_at = NOW()
        WHERE id::text = ${invoiceId}
          AND company_id::text = ${companyId}
        RETURNING
          id::text,
          company_id::text,
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

      const processedLineCount = lineRows.filter(
        (line) => line.category !== "ignore",
      ).length;

      return NextResponse.json({
        success: true,
        invoice: formatInvoice(invoiceRows[0]),
        lines: lineRows.map(formatInvoiceLine),
        data: lineRows.map(formatInvoiceLine),
        processedLineCount,
        linesProcessed: processedLineCount,
      });
    }

    if (action === "update_line" || action === "updateLine" || body.lineId) {
      const lineId = cleanText(body.lineId ?? body.id ?? body.line_id);

      if (!lineId) {
        return NextResponse.json(
          {
            success: false,
            error: "lineId is required",
          },
          { status: 400 },
        );
      }

      const quantity = toNumber(body.quantity as string | number | null | undefined);
      const unitPrice = toNumber(body.unitPrice as string | number | null);
      const unitPriceFallback = toNumber(body.unit_price as string | number | null);
      const finalUnitPrice = unitPrice > 0 ? unitPrice : unitPriceFallback;
      const incomingLineTotal = toNumber(
        body.lineTotal as string | number | null,
      );
      const lineTotalFallback = toNumber(
        body.line_total as string | number | null,
      );
      const finalLineTotal =
        incomingLineTotal > 0
          ? incomingLineTotal
          : lineTotalFallback > 0
            ? lineTotalFallback
            : quantity * finalUnitPrice;

      const lineRows = await sql<InvoiceLineRow[]>`
        UPDATE invoice_lines
        SET
          item_name = ${cleanText(body.itemName ?? body.item_name) || "Unknown Item"},
          description = ${cleanText(body.description)},
          quantity = ${quantity}::numeric,
          unit = ${cleanText(body.unit) || "each"},
          unit_price = ${finalUnitPrice}::numeric,
          line_total = ${finalLineTotal}::numeric,
          category = ${normalizeCategory(body.category)},
          raw_ocr_text = ${cleanText(body.rawOcrText ?? body.raw_ocr_text)},
          review_note = ${cleanText(body.reviewNote ?? body.review_note)},
          status = 'needs_review',
          updated_at = NOW()
        WHERE id::text = ${lineId}
          AND invoice_id::text = ${invoiceId}
          AND company_id::text = ${companyId}
        RETURNING
          id::text,
          company_id::text,
          invoice_id::text,
          ingredient_id::text,
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
      `;

      if (!lineRows[0]) {
        return NextResponse.json(
          {
            success: false,
            error: "Invoice line not found",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        line: formatInvoiceLine(lineRows[0]),
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown invoice action",
      },
      { status: 400 },
    );
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