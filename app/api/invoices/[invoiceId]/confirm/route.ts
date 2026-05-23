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

type InvoiceLineCategory =
  | "food_ingredient"
  | "packaging_supplies"
  | "labor_service"
  | "delivery_freight"
  | "ignore"
  | string;

type InvoiceRow = {
  id: string;
  company_id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: string | number | null;
  status: string | null;
};

type InvoiceLineRow = {
  id: string;
  company_id: string | null;
  invoice_id: string;
  ingredient_id: string | null;
  item_name: string | null;
  description: string | null;
  quantity: string | number | null;
  unit: string | null;
  unit_price: string | number | null;
  line_total: string | number | null;
  category: InvoiceLineCategory | null;
  status: string | null;
};

type IngredientRow = {
  id: string;
  company_id: string;
  name: string;
  latest_cost: string | number | null;
  unit: string | null;
};

type EngineResult = {
  lineId: string;
  itemName: string;
  ingredientId: string;
  oldCost: number;
  newCost: number;
  changeAmount: number;
  changePercent: number;
  alertCreated: boolean;
};

type ConfirmInvoiceResponse = {
  success: boolean;
  invoiceId?: string;
  status?: string;
  processedLineCount?: number;
  linesProcessed?: number;
  skippedLineCount?: number;
  results?: EngineResult[];
  error?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown confirm invoice error";
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

function cleanText(value: string | null): string {
  return value?.trim() || "";
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getChangePercent(oldCost: number, newCost: number): number {
  if (oldCost <= 0) {
    return newCost > 0 ? 100 : 0;
  }

  return Number((((newCost - oldCost) / oldCost) * 100).toFixed(2));
}

function shouldCreateAlert(oldCost: number, newCost: number): boolean {
  if (oldCost <= 0 || newCost <= oldCost) {
    return false;
  }

  const changeAmount = newCost - oldCost;
  const changePercent = getChangePercent(oldCost, newCost);

  return changeAmount >= 0.01 || changePercent >= 5;
}

async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = (await getCurrentUser()) as CurrentUser | null;

  if (!currentUser?.company_id) {
    throw new Error("Unauthorized: missing company_id");
  }

  return currentUser;
}

async function findOrCreateIngredient(
  companyId: string,
  itemName: string,
  unit: string,
  newCost: number,
): Promise<IngredientRow> {
  const cleanName = itemName.trim() || "Unknown Item";
  const normalizedName = normalizeName(cleanName);

  const existingRows = await sql<IngredientRow[]>`
    SELECT
      id,
      company_id,
      name,
      latest_cost,
      unit
    FROM ingredients
    WHERE company_id = ${companyId}
    AND LOWER(name) = ${normalizedName}
    LIMIT 1
  `;

  const existingIngredient = existingRows[0];

  if (existingIngredient) {
    return existingIngredient;
  }

  const insertedRows = await sql<IngredientRow[]>`
    INSERT INTO ingredients (
      company_id,
      name,
      latest_cost,
      unit,
      created_at,
      updated_at
    )
    VALUES (
      ${companyId},
      ${cleanName},
      ${newCost}::numeric,
      ${unit || "unit"},
      NOW(),
      NOW()
    )
    RETURNING
      id,
      company_id,
      name,
      latest_cost,
      unit
  `;

  return insertedRows[0];
}

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<ConfirmInvoiceResponse>> {
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
        status
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

    const allInvoiceLines = await sql<InvoiceLineRow[]>`
      SELECT
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
        COALESCE(category, 'food_ingredient') AS category,
        status
      FROM invoice_lines
      WHERE invoice_id = ${invoiceId}
      AND company_id = ${currentUser.company_id}
      ORDER BY created_at ASC
    `;

    if (allInvoiceLines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No invoice lines found for this invoice.",
        },
        { status: 400 },
      );
    }

    const foodInvoiceLines = allInvoiceLines.filter((line) => {
      return (line.category ?? "food_ingredient") === "food_ingredient";
    });

    const skippedLineCount = allInvoiceLines.length - foodInvoiceLines.length;

    if (foodInvoiceLines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No food ingredient lines selected. Choose Food Ingredient for at least one line before confirming.",
        },
        { status: 400 },
      );
    }

    const results: EngineResult[] = [];

    for (const line of foodInvoiceLines) {
      const itemName = cleanText(line.item_name) || "Unknown Item";
      const unit = cleanText(line.unit) || "unit";
      const quantity = toNumber(line.quantity);
      const unitPrice = toNumber(line.unit_price);
      const lineTotal = toNumber(line.line_total);
      const newCost =
        unitPrice > 0 ? unitPrice : quantity > 0 ? lineTotal / quantity : 0;

      const ingredient = await findOrCreateIngredient(
        currentUser.company_id,
        itemName,
        unit,
        newCost,
      );

      const oldCost = toNumber(ingredient.latest_cost);
      const changeAmount = Number((newCost - oldCost).toFixed(4));
      const changePercent = getChangePercent(oldCost, newCost);
      const alertNeeded = shouldCreateAlert(oldCost, newCost);

      await sql`
        UPDATE ingredients
        SET
          latest_cost = CASE
            WHEN ${newCost}::numeric > 0::numeric THEN ${newCost}::numeric
            ELSE latest_cost
          END,
          unit = COALESCE(NULLIF(${unit}, ''), unit),
          updated_at = NOW()
        WHERE id = ${ingredient.id}
        AND company_id = ${currentUser.company_id}
      `;

      await sql`
        UPDATE invoice_lines
        SET
          ingredient_id = ${ingredient.id},
          status = 'confirmed',
          updated_at = NOW()
        WHERE id = ${line.id}
        AND company_id = ${currentUser.company_id}
      `;

      await sql`
        INSERT INTO price_history (
          company_id,
          ingredient_id,
          ingredient_name,
          invoice_id,
          invoice_line_id,
          vendor_name,
          old_cost,
          new_cost,
          change_amount,
          change_percent,
          unit,
          source,
          created_at
        )
        VALUES (
          ${currentUser.company_id},
          ${ingredient.id},
          ${itemName},
          ${invoiceId},
          ${line.id},
          ${invoice.vendor_name ?? "Unknown Vendor"},
          ${oldCost}::numeric,
          ${newCost}::numeric,
          ${changeAmount}::numeric,
          ${changePercent}::numeric,
          ${unit},
          'invoice_confirm',
          NOW()
        )
      `;

      if (alertNeeded) {
        await sql`
          INSERT INTO alerts (
            company_id,
            title,
            message,
            alert_type,
            severity,
            status,
            ingredient_id,
            ingredient_name,
            old_cost,
            new_cost,
            change_percent,
            invoice_id,
            created_at,
            updated_at
          )
          VALUES (
            ${currentUser.company_id},
            ${`${itemName} cost increased`},
            ${`${itemName} increased from $${oldCost.toFixed(2)} to $${newCost.toFixed(2)} per ${unit}.`},
            'cost_increase',
            'warning',
            'open',
            ${ingredient.id},
            ${itemName},
            ${oldCost}::numeric,
            ${newCost}::numeric,
            ${changePercent}::numeric,
            ${invoiceId},
            NOW(),
            NOW()
          )
        `;
      }

      results.push({
        lineId: line.id,
        itemName,
        ingredientId: ingredient.id,
        oldCost,
        newCost,
        changeAmount,
        changePercent,
        alertCreated: alertNeeded,
      });
    }

    await sql`
      UPDATE invoice_lines
      SET
        status = 'skipped',
        updated_at = NOW()
      WHERE invoice_id = ${invoiceId}
      AND company_id = ${currentUser.company_id}
      AND COALESCE(category, 'food_ingredient') <> 'food_ingredient'
    `;

    await sql`
      UPDATE invoices
      SET
        status = 'confirmed',
        updated_at = NOW()
      WHERE id = ${invoiceId}
      AND company_id = ${currentUser.company_id}
    `;

    return NextResponse.json({
      success: true,
      invoiceId,
      status: "confirmed",
      processedLineCount: results.length,
      linesProcessed: results.length,
      skippedLineCount,
      results,
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