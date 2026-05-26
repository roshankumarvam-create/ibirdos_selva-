import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

type CurrentSession = {
  id?: string;
  email?: string;
  role?: string;
  company_id?: string;
  companyId?: string;
};

type InvoiceLineCategory =
  | "food_ingredient"
  | "packaging_supplies"
  | "labor_service"
  | "delivery_freight"
  | "ignore";

type AzureCurrency = {
  amount?: number;
  currencyCode?: string;
};

type AzureField = {
  content?: string;
  valueString?: string;
  valueNumber?: number;
  valueInteger?: number;
  valueDate?: string;
  valueCurrency?: AzureCurrency;
  valueArray?: AzureField[];
  valueObject?: Record<string, AzureField>;
};

type AzureDocument = {
  fields?: Record<string, AzureField>;
};

type AzureAnalyzeOperation = {
  status?: string;
  analyzeResult?: {
    content?: string;
    documents?: AzureDocument[];
  };
  error?: {
    message?: string;
  };
};

type ExtractedInvoiceLine = {
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  category: InvoiceLineCategory;
  rawOcrText: string;
};

type ExtractedInvoice = {
  vendorName: string;
  invoiceNumber: string;
  trackingNumber: string;
  invoiceDate: string | null;
  invoiceTotal: number;
  lines: ExtractedInvoiceLine[];
};

type InsertedInvoiceRow = {
  id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: string | number | null;
  status: string | null;
};

type InsertedLineRow = {
  id: string;
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
};

type UploadResponse = {
  success: boolean;
  invoiceId?: string;
  redirectUrl?: string;
  invoice?: {
    id: string;
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    status: string;
  };
  lines?: {
    id: string;
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
  }[];
  error?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Invoice upload failed";
}

function isDuplicateInvoiceError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const possibleError = error as {
    code?: unknown;
    message?: unknown;
    constraint_name?: unknown;
    constraint?: unknown;
  };

  const code = typeof possibleError.code === "string" ? possibleError.code : "";
  const message =
    typeof possibleError.message === "string" ? possibleError.message : "";
  const constraintName =
    typeof possibleError.constraint_name === "string"
      ? possibleError.constraint_name
      : typeof possibleError.constraint === "string"
        ? possibleError.constraint
        : "";

  return (
    code === "23505" ||
    message.includes("invoices_company_vendor_invoice_unique") ||
    constraintName.includes("invoices_company_vendor_invoice_unique")
  );
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "");
    const parsed = Number(cleaned);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function extractTrackingNumberFromText(value: string): string {
  const text = cleanText(value);
  const match =
    text.match(/Tracking\s*#?\s*:?\s*(\d{5,})/i) ||
    text.match(/Tracking\s+(\d{5,})/i) ||
    text.match(/Order\s*#?\s*:?\s*(\d{5,})/i);

  return match?.[1] ?? "";
}

function makeFinalInvoiceNumber(invoiceNumber: string, trackingNumber: string): string {
  const cleanInvoiceNumber = cleanText(invoiceNumber);
  const cleanTrackingNumber = cleanText(trackingNumber);

  if (cleanInvoiceNumber) {
    return cleanInvoiceNumber;
  }

  if (cleanTrackingNumber) {
    return `TRACK-${cleanTrackingNumber.replace(/^TRACK-/i, "")}`;
  }

  return "";
}

function safeCell(row: string[], index: number): string {
  if (index < 0) {
    return "";
  }

  return row[index] ?? "";
}

function normalizeInvoiceLineCategory(value: string): InvoiceLineCategory {
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

function cleanInvoiceItemName(value: string): string {
  const compactValue = cleanText(value).replace(/\s+/g, " ");

  if (!compactValue) {
    return "Unknown Item";
  }

  const cleanedValue = compactValue
    .replace(/\bQuantity\s*:?\s*[\d.]+/gi, " ")
    .replace(/\bPrice\s*:?\s*\$?[\d,.]+/gi, " ")
    .replace(/\bTotal\s*:?\s*\$?[\d,.]+/gi, " ")
    .replace(/\bInvoice\s*:?\s*\S+/gi, " ")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/\b\d{5,}\b/g, " ")
    .replace(/\b(?:CS|EA|LB|OZ|CA|PK|BX|CT)\b\s*,?\s*\d*\s*(?:EA|CS|LB|OZ)?/gi, " ")
    .replace(/\bGrocery\b/gi, " ")
    .replace(/\bStoreroom\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const readableMatch = cleanedValue.match(/[A-Za-z][A-Za-z0-9#&'./() -]{3,}/);
  const readableName = cleanText(readableMatch?.[0] ?? cleanedValue);

  if (!readableName) {
    return "Unknown Item";
  }

  return readableName.length > 72
    ? `${readableName.slice(0, 72).trim()}...`
    : readableName;
}

function detectInvoiceLineCategory(
  itemName: string,
  description: string,
): InvoiceLineCategory {
  const text = `${itemName} ${description}`.toLowerCase();

  if (
    text.includes("fuel surcharge") ||
    text.includes("freight") ||
    text.includes("delivery") ||
    text.includes("shipping")
  ) {
    return "delivery_freight";
  }

  if (
    text.includes("staff") ||
    text.includes("labor") ||
    text.includes("consulting") ||
    text.includes("service")
  ) {
    return "labor_service";
  }

  if (
    text.includes("nitrile") ||
    text.includes("glove") ||
    text.includes("fdsrv") ||
    text.includes("foil") ||
    text.includes("container") ||
    text.includes("lid") ||
    text.includes("cup") ||
    text.includes("plate") ||
    text.includes("napkin") ||
    text.includes("bag") ||
    text.includes("wrap") ||
    text.includes("sanitizer") ||
    text.includes("chemical") ||
    text.includes("detergent")
  ) {
    return "packaging_supplies";
  }

  if (
    text.includes("credit") ||
    text.includes("adjustment") ||
    text.includes("rebate")
  ) {
    return "ignore";
  }

  return "food_ingredient";
}

function getField(
  fields: Record<string, AzureField> | undefined,
  key: string,
): AzureField | undefined {
  return fields?.[key];
}

function getFieldText(field: AzureField | undefined): string {
  if (!field) {
    return "";
  }

  return cleanText(field.valueString ?? field.content ?? field.valueDate ?? "");
}

function getFieldNumber(field: AzureField | undefined): number {
  if (!field) {
    return 0;
  }

  if (typeof field.valueNumber === "number") {
    return toNumber(field.valueNumber);
  }

  if (typeof field.valueInteger === "number") {
    return toNumber(field.valueInteger);
  }

  if (field.valueCurrency?.amount !== undefined) {
    return toNumber(field.valueCurrency.amount);
  }

  return toNumber(field.valueString ?? field.content ?? null);
}

function normalizeDate(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());

  return cells;
}

function parseCsvInvoice(
  fileText: string,
  fallbackFileName: string,
): ExtractedInvoice {
  const rows = fileText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);

  if (rows.length === 0) {
    return {
      vendorName: "Unknown Vendor",
      invoiceNumber: "",
      trackingNumber: extractTrackingNumberFromText(fallbackFileName),
      invoiceDate: null,
      invoiceTotal: 0,
      lines: [
        {
          itemName: fallbackFileName || "Uploaded invoice",
          description: "",
          quantity: 1,
          unit: "unit",
          unitPrice: 0,
          lineTotal: 0,
          category: "food_ingredient",
          rawOcrText: "",
        },
      ],
    };
  }

  const headers = rows[0].map((header) =>
    header.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const bodyRows = rows.slice(1);

  function columnIndex(possibleNames: string[]): number {
    return headers.findIndex((header) => possibleNames.includes(header));
  }

  const itemIndex = columnIndex([
    "item",
    "itemname",
    "product",
    "productname",
    "description",
  ]);
  const descriptionIndex = columnIndex(["description", "desc"]);
  const quantityIndex = columnIndex(["quantity", "qty"]);
  const unitIndex = columnIndex(["unit", "uom"]);
  const unitPriceIndex = columnIndex(["unitprice", "price", "cost", "unitcost"]);
  const lineTotalIndex = columnIndex([
    "linetotal",
    "amount",
    "total",
    "extendedprice",
  ]);
  const categoryIndex = columnIndex(["category", "type", "linecategory"]);
  const vendorIndex = columnIndex([
    "vendor",
    "vendorname",
    "supplier",
    "suppliername",
  ]);
  const invoiceNumberIndex = columnIndex([
    "invoicenumber",
    "invoice",
    "invoiceid",
  ]);
  const trackingNumberIndex = columnIndex([
    "tracking",
    "trackingnumber",
    "trackingid",
    "ordernumber",
  ]);
  const invoiceDateIndex = columnIndex(["invoicedate", "date"]);

  const lines: ExtractedInvoiceLine[] = bodyRows.map((row) => {
    const rawItemName =
      cleanText(safeCell(row, itemIndex)) ||
      cleanText(safeCell(row, descriptionIndex)) ||
      "Unknown Item";
    const description = cleanText(safeCell(row, descriptionIndex)) || rawItemName;
    const quantityRaw = toNumber(safeCell(row, quantityIndex) || "1");
    const quantity = quantityRaw > 0 ? quantityRaw : 1;
    const unit = cleanText(safeCell(row, unitIndex)) || "unit";
    const rawLineTotal = roundMoney(toNumber(safeCell(row, lineTotalIndex)));
    const extractedUnitPrice = roundMoney(toNumber(safeCell(row, unitPriceIndex)));
    const calculatedUnitPrice =
      extractedUnitPrice > 0
        ? extractedUnitPrice
        : rawLineTotal > 0 && quantity > 0
          ? roundMoney(rawLineTotal / quantity)
          : 0;
    const calculatedLineTotal = roundMoney(quantity * calculatedUnitPrice);
    const lineTotal = rawLineTotal > 0 ? rawLineTotal : calculatedLineTotal;
    const itemName = cleanInvoiceItemName(rawItemName);
    const detectedCategory = detectInvoiceLineCategory(itemName, description);
    const csvCategory = normalizeInvoiceLineCategory(cleanText(safeCell(row, categoryIndex)));
    const category = cleanText(safeCell(row, categoryIndex)) ? csvCategory : detectedCategory;

    return {
      itemName,
      description,
      quantity,
      unit,
      unitPrice: calculatedUnitPrice,
      lineTotal,
      category,
      rawOcrText: rawItemName,
    };
  });

  const firstDataRow = bodyRows[0] ?? [];
  const invoiceTotal = roundMoney(
    lines.reduce((sum, line) => {
      return sum + line.lineTotal;
    }, 0),
  );

  return {
    vendorName: cleanText(safeCell(firstDataRow, vendorIndex)) || "Uploaded Vendor",
    invoiceNumber: cleanText(safeCell(firstDataRow, invoiceNumberIndex)),
    trackingNumber:
      cleanText(safeCell(firstDataRow, trackingNumberIndex)) ||
      extractTrackingNumberFromText(fileText) ||
      extractTrackingNumberFromText(fallbackFileName),
    invoiceDate: normalizeDate(cleanText(safeCell(firstDataRow, invoiceDateIndex))),
    invoiceTotal,
    lines,
  };
}

async function analyzeInvoiceWithAzure(params: {
  endpoint: string;
  key: string;
  apiVersion: string;
  fileBytes: Buffer;
  contentType: string;
}): Promise<AzureAnalyzeOperation> {
  const endpoint = params.endpoint.replace(/\/+$/, "");
  const analyzeUrl = `${endpoint}/formrecognizer/documentModels/prebuilt-invoice:analyze?api-version=${params.apiVersion}`;
  const requestBody = new Blob([new Uint8Array(params.fileBytes)], {
    type: params.contentType,
  });

  const analyzeResponse = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Content-Type": params.contentType,
      "Ocp-Apim-Subscription-Key": params.key,
    },
    body: requestBody,
  });

  if (!analyzeResponse.ok) {
    const text = await analyzeResponse.text();
    throw new Error(`Azure analyze failed: ${text}`);
  }

  const operationLocation = analyzeResponse.headers.get("operation-location");

  if (!operationLocation) {
    throw new Error("Azure did not return operation-location.");
  }

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    const pollResponse = await fetch(operationLocation, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": params.key,
      },
    });

    const result = (await pollResponse.json()) as AzureAnalyzeOperation;

    if (!pollResponse.ok) {
      throw new Error(result.error?.message ?? "Azure polling failed.");
    }

    if (result.status === "succeeded") {
      return result;
    }

    if (result.status === "failed") {
      throw new Error(result.error?.message ?? "Azure invoice extraction failed.");
    }
  }

  throw new Error("Azure invoice extraction timed out.");
}

function extractInvoiceData(
  azureResult: AzureAnalyzeOperation,
  fallbackFileName: string,
): ExtractedInvoice {
  const document = azureResult.analyzeResult?.documents?.[0];
  const fields = document?.fields;
  const fullText = azureResult.analyzeResult?.content ?? "";

  const vendorName =
    getFieldText(getField(fields, "VendorName")) ||
    getFieldText(getField(fields, "VendorAddressRecipient")) ||
    "Unknown Vendor";

  const invoiceNumber =
    getFieldText(getField(fields, "InvoiceId")) ||
    getFieldText(getField(fields, "InvoiceNumber"));

  const trackingNumber =
    getFieldText(getField(fields, "TrackingNumber")) ||
    getFieldText(getField(fields, "TrackingId")) ||
    extractTrackingNumberFromText(fullText) ||
    extractTrackingNumberFromText(fallbackFileName);

  const invoiceDate = normalizeDate(
    getFieldText(getField(fields, "InvoiceDate")),
  );

  const invoiceTotal = roundMoney(
    getFieldNumber(getField(fields, "InvoiceTotal")) ||
      getFieldNumber(getField(fields, "AmountDue")) ||
      getFieldNumber(getField(fields, "SubTotal")),
  );

  const itemsField = getField(fields, "Items");
  const itemFields = itemsField?.valueArray ?? [];

  const lines: ExtractedInvoiceLine[] = itemFields.map((itemField) => {
    const itemObject = itemField.valueObject ?? {};

    const rawItemText =
      getFieldText(itemObject.Description) ||
      getFieldText(itemObject.ProductCode) ||
      getFieldText(itemObject.Name) ||
      getFieldText(itemObject.Item) ||
      cleanText(itemField.content) ||
      "Unknown Item";

    const itemName = cleanInvoiceItemName(rawItemText);
    const quantityRaw = getFieldNumber(itemObject.Quantity);
    const quantity = quantityRaw > 0 ? quantityRaw : 1;

    const unit =
      getFieldText(itemObject.Unit) ||
      getFieldText(itemObject.UnitOfMeasure) ||
      getFieldText(itemObject.UOM) ||
      "unit";

    const rawLineTotal = roundMoney(
      getFieldNumber(itemObject.Amount) ||
        getFieldNumber(itemObject.LineTotal) ||
        getFieldNumber(itemObject.TotalPrice),
    );

    const extractedUnitPrice = roundMoney(
      getFieldNumber(itemObject.UnitPrice),
    );

    const calculatedUnitPrice =
      extractedUnitPrice > 0
        ? extractedUnitPrice
        : rawLineTotal > 0 && quantity > 0
          ? roundMoney(rawLineTotal / quantity)
          : 0;

    const calculatedLineTotal = roundMoney(quantity * calculatedUnitPrice);
    const lineTotal = rawLineTotal > 0 ? rawLineTotal : calculatedLineTotal;
    const category = detectInvoiceLineCategory(itemName, rawItemText);

    return {
      itemName,
      description: rawItemText,
      quantity,
      unit,
      unitPrice: calculatedUnitPrice,
      lineTotal,
      category,
      rawOcrText: rawItemText,
    };
  });

  const cleanLines: ExtractedInvoiceLine[] =
    lines.length > 0
      ? lines
      : [
          {
            itemName: fallbackFileName || "Uploaded invoice",
            description: "",
            quantity: 1,
            unit: "unit",
            unitPrice: invoiceTotal,
            lineTotal: invoiceTotal,
            category: "food_ingredient",
            rawOcrText: "",
          },
        ];

  const calculatedTotal = roundMoney(
    cleanLines.reduce((sum, line) => {
      return sum + line.lineTotal;
    }, 0),
  );

  return {
    vendorName,
    invoiceNumber,
    trackingNumber,
    invoiceDate,
    invoiceTotal: invoiceTotal > 0 ? invoiceTotal : calculatedTotal,
    lines: cleanLines,
  };
}

function formatInvoice(row: InsertedInvoiceRow): UploadResponse["invoice"] {
  return {
    id: row.id,
    vendorName: row.vendor_name ?? "Unknown Vendor",
    invoiceNumber: row.invoice_number ?? "",
    invoiceDate: row.invoice_date ?? "",
    totalAmount: toNumber(row.total_amount),
    status: row.status ?? "needs_review",
  };
}

function formatLine(
  row: InsertedLineRow,
): NonNullable<UploadResponse["lines"]>[number] {
  return {
    id: row.id,
    itemName: row.item_name ?? "Unknown Item",
    description: row.description ?? "",
    quantity: toNumber(row.quantity),
    unit: row.unit ?? "unit",
    unitPrice: toNumber(row.unit_price),
    lineTotal: toNumber(row.line_total),
    category: row.category ?? "food_ingredient",
    rawOcrText: row.raw_ocr_text ?? "",
    reviewNote: row.review_note ?? "",
    status: row.status ?? "needs_review",
  };
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<UploadResponse>> {
  try {
    const session = (await getSessionFromRequest(request)) as CurrentSession | null;
    const companyId = session?.company_id ?? session?.companyId ?? "";

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing company_id" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing invoice file. Upload using form field name: file",
        },
        { status: 400 },
      );
    }

    if (fileValue.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Invoice file is too large. Max size is 20MB.",
        },
        { status: 400 },
      );
    }

    const fileBytes = Buffer.from(await fileValue.arrayBuffer());
    const fileName = fileValue.name || "invoice-upload";
    const contentType = fileValue.type || "application/pdf";
    const isCsvFile =
      contentType.includes("csv") || fileName.toLowerCase().endsWith(".csv");

    let extracted: ExtractedInvoice;

    if (isCsvFile) {
      extracted = parseCsvInvoice(fileBytes.toString("utf8"), fileName);
    } else {
      const azureEndpoint =
        process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT ?? "";
      const azureKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY ?? "";
      const azureApiVersion =
        process.env.AZURE_DOCUMENT_INTELLIGENCE_API_VERSION ?? "2023-07-31";

      if (!azureEndpoint || !azureKey) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Missing Azure Document Intelligence env values. Add AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY.",
          },
          { status: 500 },
        );
      }

      const azureResult = await analyzeInvoiceWithAzure({
        endpoint: azureEndpoint,
        key: azureKey,
        apiVersion: azureApiVersion,
        fileBytes,
        contentType,
      });

      extracted = extractInvoiceData(azureResult, fileName);
    }

    const finalInvoiceNumber = makeFinalInvoiceNumber(
      extracted.invoiceNumber,
      extracted.trackingNumber,
    );

    if (!finalInvoiceNumber) {
      return NextResponse.json(
        { success: false, error: "Invoice number or tracking number is required." },
        { status: 400 },
      );
    }

    const duplicateRows = await sql<{ id: string }[]>`
      SELECT id::text
      FROM invoices
      WHERE company_id::text = ${companyId}
        AND LOWER(TRIM(vendor_name)) = LOWER(TRIM(${extracted.vendorName}))
        AND TRIM(invoice_number) = TRIM(${finalInvoiceNumber})
      LIMIT 1
    `;

    if (duplicateRows[0]) {
      return NextResponse.json(
        {
          success: false,
          error: "Duplicate invoice: this vendor invoice number already exists.",
          invoiceId: duplicateRows[0].id,
          redirectUrl: `/invoices/${duplicateRows[0].id}`,
        },
        { status: 409 },
      );
    }

    const result: {
      invoice: InsertedInvoiceRow;
      lines: InsertedLineRow[];
    } = await sql.begin(async (transaction) => {
      const invoiceId = randomUUID();

      const insertedInvoices = await transaction<InsertedInvoiceRow[]>`
        INSERT INTO invoices (
          id,
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
          ${invoiceId},
          ${companyId},
          ${extracted.vendorName},
          ${finalInvoiceNumber},
          ${extracted.invoiceDate},
          ${extracted.invoiceTotal}::numeric,
          'needs_review',
          'unpaid',
          NOW(),
          NOW()
        )
        RETURNING
          id,
          vendor_name,
          invoice_number,
          invoice_date,
          total_amount,
          status
      `;

      const insertedLines: InsertedLineRow[] = [];

      for (const line of extracted.lines) {
        const lineId = randomUUID();

        const lineRows = await transaction<InsertedLineRow[]>`
          INSERT INTO invoice_lines (
            id,
            company_id,
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
          )
          VALUES (
            ${lineId},
            ${companyId},
            ${invoiceId},
            NULL,
            ${line.itemName || "Unknown Item"},
            ${line.description || ""},
            ${line.quantity}::numeric,
            ${line.unit || "unit"},
            ${line.unitPrice}::numeric,
            ${line.lineTotal}::numeric,
            ${line.category},
            ${line.rawOcrText || ""},
            '',
            'needs_review',
            NOW(),
            NOW()
          )
          RETURNING
            id,
            item_name,
            description,
            quantity,
            unit,
            unit_price,
            line_total,
            category,
            raw_ocr_text,
            review_note,
            status
        `;

        insertedLines.push(lineRows[0]);
      }

      return {
        invoice: insertedInvoices[0],
        lines: insertedLines,
      };
    });

    return NextResponse.json({
      success: true,
      invoiceId: result.invoice.id,
      redirectUrl: `/invoices/${result.invoice.id}`,
      invoice: formatInvoice(result.invoice),
      lines: result.lines.map(formatLine),
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