import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "@/app/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type SessionUser = {
  user_id?: string;
  email?: string;
  role?: string;
  company_id?: string;
};

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

type InvoiceConfirmLineInput = {
  id?: string | null;
  rawItemName?: string;
  raw_item_name?: string;
  itemText?: string;
  item_text?: string;
  ingredientName?: string;
  ingredient_name?: string;
  matchedIngredientId?: string | null;
  matched_ingredient_id?: string | null;
  quantity?: number | string;
  unit?: string;
  packSize?: string;
  pack_size?: string;
  unitCost?: number | string;
  unit_cost?: number | string;
  totalCost?: number | string;
  total_cost?: number | string;
};

type InvoiceConfirmBody = {
  invoiceId?: string | null;
  vendorName?: string;
  vendor_name?: string;
  invoiceNumber?: string;
  invoice_number?: string;
  invoiceDate?: string;
  invoice_date?: string;
  subtotal?: number | string;
  tax?: number | string;
  total?: number | string;
  fileUrl?: string;
  file_url?: string;
  status?: string;
  lines?: InvoiceConfirmLineInput[];
  invoiceLines?: InvoiceConfirmLineInput[];
  invoice_lines?: InvoiceConfirmLineInput[];
};

type CleanInvoiceLine = {
  rawItemName: string;
  itemText: string;
  ingredientName: string;
  matchedIngredientId: string | null;
  quantity: number;
  unit: string;
  packSize: string;
  unitCost: number;
  totalCost: number;
};

type InvoiceRow = {
  id: string;
  company_id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  subtotal: string | number | null;
  tax: string | number | null;
  total: string | number | null;
  file_url: string | null;
  status: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

type InvoiceLineRow = {
  id: string;
  company_id: string;
  invoice_id: string;
  raw_item_name: string | null;
  item_text: string | null;
  matched_ingredient_id: string | null;
  quantity: string | number | null;
  unit: string | null;
  pack_size: string | null;
  unit_cost: string | number | null;
  total_cost: string | number | null;
  created_at: string | Date | null;
};

type IngredientRow = {
  id: string;
  name: string | null;
  latest_cost: string | number | null;
  latest_unit: string | null;
  unit: string | null;
};

type PriceChangeResult = {
  ingredientId: string;
  ingredientName: string;
  oldCost: number;
  newCost: number;
  changeAmount: number;
  changePercent: number;
};

type RecalculatedRecipeRow = {
  id: string;
  name: string | null;
  total_food_cost: string | number | null;
  cost_per_serving: string | number | null;
  margin_percent: string | number | null;
};

type ConfirmResponse =
  | {
      success: true;
      message: string;
      invoice: InvoiceRow;
      invoiceLines: InvoiceLineRow[];
      priceChanges: PriceChangeResult[];
      recalculatedRecipes: RecalculatedRecipeRow[];
    }
  | {
      success: false;
      error: string;
    };

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: "Invoice confirm API is working.",
  });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ConfirmResponse>> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureInvoiceEngineTables();

    const body = (await request.json()) as InvoiceConfirmBody;

    const vendorName = cleanText(body.vendorName ?? body.vendor_name);

    if (!vendorName) {
      return NextResponse.json(
        {
          success: false,
          error: "vendorName is required.",
        },
        { status: 400 },
      );
    }

    const cleanLines = normalizeInvoiceLines(
      body.lines ?? body.invoiceLines ?? body.invoice_lines ?? [],
    );

    if (cleanLines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one invoice line is required.",
        },
        { status: 400 },
      );
    }

    const result = await sql.begin(async (tx) => {
      const invoice = await saveInvoice(tx, currentUser, body, vendorName);

      await tx`
        DELETE FROM invoice_lines
        WHERE invoice_id::text = ${invoice.id}
        AND company_id::text = ${currentUser.company_id};
      `;

      const savedInvoiceLines: InvoiceLineRow[] = [];
      const priceChanges: PriceChangeResult[] = [];
      const changedIngredientIds = new Set<string>();

      for (const line of cleanLines) {
        const ingredientResult = await findOrCreateIngredient(tx, currentUser, line);
        const ingredientId = ingredientResult.ingredient.id;

        const savedLineRows = await tx<InvoiceLineRow[]>`
          INSERT INTO invoice_lines (
            id,
            company_id,
            invoice_id,
            raw_item_name,
            item_text,
            matched_ingredient_id,
            quantity,
            unit,
            pack_size,
            unit_cost,
            total_cost,
            created_at
          )
          VALUES (
            gen_random_uuid(),
            ${currentUser.company_id},
            ${invoice.id},
            ${line.rawItemName},
            ${line.itemText},
            ${ingredientId},
            ${line.quantity},
            ${line.unit},
            ${line.packSize},
            ${line.unitCost}, 
            ${line.totalCost},
            NOW()
          )
          RETURNING
            id,
            company_id,
            invoice_id,
            raw_item_name,
            item_text,
            matched_ingredient_id,
            quantity,
            unit,
            pack_size,
            unit_cost,
            total_cost,
            created_at;
        `;

        const savedLine = savedLineRows[0];

        if (savedLine) {
          savedInvoiceLines.push(savedLine);
        }

        if (ingredientResult.priceChanged) {
          changedIngredientIds.add(ingredientId);

          const change = ingredientResult.priceChange;
          priceChanges.push(change);

          await createPriceHistory(tx, currentUser.company_id, invoice.id, change);
          await createCostAlert(tx, currentUser.company_id, invoice.id, change);
        }
      }

      const recalculatedRecipes = await recalculateRecipesForIngredients(
        tx,
        currentUser.company_id,
        Array.from(changedIngredientIds),
      );

      return {
        invoice,
        invoiceLines: savedInvoiceLines,
        priceChanges,
        recalculatedRecipes,
      };
    });

    return NextResponse.json({
      success: true,
      message:
        "Invoice confirmed. Ingredients, price history, alerts, and recipe costs updated.",
      invoice: result.invoice,
      invoiceLines: result.invoiceLines,
      priceChanges: result.priceChanges,
      recalculatedRecipes: result.recalculatedRecipes,
    });
  } catch (error: unknown) {
    console.error("POST /api/invoices/confirm error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getStatusCode(error) },
    );
  }
}

async function getCurrentUser(request: NextRequest): Promise<CurrentUser> {
  const session = (await getSessionFromRequest(request)) as SessionUser | null;

  if (
    !session ||
    typeof session.user_id !== "string" ||
    typeof session.email !== "string" ||
    typeof session.role !== "string" ||
    typeof session.company_id !== "string" ||
    session.company_id.trim().length === 0
  ) {
    throw new Error("Not authenticated");
  }

  return {
    id: session.user_id,
    email: session.email,
    role: session.role,
    company_id: session.company_id,
  };
}

async function ensureInvoiceEngineTables(): Promise<void> {
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
      subtotal NUMERIC DEFAULT 0,
      tax NUMERIC DEFAULT 0,
      total NUMERIC DEFAULT 0,
      file_url TEXT,
      status TEXT DEFAULT 'reviewed',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      invoice_id UUID NOT NULL,
      raw_item_name TEXT,
      item_text TEXT NOT NULL DEFAULT '',
      matched_ingredient_id UUID,
      quantity NUMERIC DEFAULT 0,
      unit TEXT DEFAULT 'unit',
      pack_size TEXT,
      unit_cost NUMERIC DEFAULT 0,
      total_cost NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ingredients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      name TEXT,
      unit TEXT DEFAULT 'unit',
      latest_unit TEXT DEFAULT 'unit',
      latest_cost NUMERIC DEFAULT 0,
      vendor_name TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS price_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      ingredient_id UUID,
      old_cost NUMERIC DEFAULT 0,
      new_cost NUMERIC DEFAULT 0,
      change_amount NUMERIC DEFAULT 0,
      change_percent NUMERIC DEFAULT 0,
      source TEXT DEFAULT 'invoice',
      invoice_id UUID,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      type TEXT,
      alert_type TEXT,
      title TEXT,
      message TEXT,
      severity TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      ingredient_id UUID,
      invoice_id UUID,
      event_id UUID,
      recipe_id UUID,
      ingredient_name TEXT,
      old_cost NUMERIC DEFAULT 0,
      new_cost NUMERIC DEFAULT 0,
      change_percent NUMERIC DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS vendor_name TEXT,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS invoice_date DATE,
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS file_url TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'reviewed',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE invoice_lines
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS invoice_id UUID,
    ADD COLUMN IF NOT EXISTS raw_item_name TEXT,
    ADD COLUMN IF NOT EXISTS item_text TEXT,
    ADD COLUMN IF NOT EXISTS matched_ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unit',
    ADD COLUMN IF NOT EXISTS pack_size TEXT,
    ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    UPDATE invoice_lines
    SET item_text = COALESCE(item_text, raw_item_name, '')
    WHERE item_text IS NULL;
  `;

  await sql`
    ALTER TABLE invoice_lines
    ALTER COLUMN item_text SET DEFAULT '',
    ALTER COLUMN item_text SET NOT NULL,
    ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric,
    ALTER COLUMN unit_cost TYPE NUMERIC USING unit_cost::numeric,
    ALTER COLUMN total_cost TYPE NUMERIC USING total_cost::numeric;
  `;

  await sql`
    ALTER TABLE ingredients
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unit',
    ADD COLUMN IF NOT EXISTS latest_unit TEXT DEFAULT 'unit',
    ADD COLUMN IF NOT EXISTS latest_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS vendor_name TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE ingredients
    ALTER COLUMN latest_cost TYPE NUMERIC USING latest_cost::numeric;
  `;

  await sql`
    ALTER TABLE price_history
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS old_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS new_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS change_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS change_percent NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'invoice',
    ADD COLUMN IF NOT EXISTS invoice_id UUID,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE price_history
    ALTER COLUMN old_cost TYPE NUMERIC USING old_cost::numeric,
    ALTER COLUMN new_cost TYPE NUMERIC USING new_cost::numeric,
    ALTER COLUMN change_amount TYPE NUMERIC USING change_amount::numeric,
    ALTER COLUMN change_percent TYPE NUMERIC USING change_percent::numeric;
  `;

  await sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS type TEXT,
    ADD COLUMN IF NOT EXISTS alert_type TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS invoice_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS recipe_id UUID,
    ADD COLUMN IF NOT EXISTS ingredient_name TEXT,
    ADD COLUMN IF NOT EXISTS old_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS new_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS change_percent NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE alerts
    ALTER COLUMN old_cost TYPE NUMERIC USING old_cost::numeric,
    ALTER COLUMN new_cost TYPE NUMERIC USING new_cost::numeric,
    ALTER COLUMN change_percent TYPE NUMERIC USING change_percent::numeric;
  `;

  await sql`
    ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS total_food_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cost_per_serving NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_percent NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS servings NUMERIC DEFAULT 1,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE recipes
    ALTER COLUMN servings TYPE NUMERIC USING servings::numeric,
    ALTER COLUMN selling_price TYPE NUMERIC USING selling_price::numeric,
    ALTER COLUMN total_food_cost TYPE NUMERIC USING total_food_cost::numeric,
    ALTER COLUMN cost_per_serving TYPE NUMERIC USING cost_per_serving::numeric,
    ALTER COLUMN margin_percent TYPE NUMERIC USING margin_percent::numeric;
  `;

  await sql`
    ALTER TABLE recipe_ingredients
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS recipe_id UUID,
    ADD COLUMN IF NOT EXISTS ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unit',
    ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  `;

  await sql`
    ALTER TABLE recipe_ingredients
    ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric,
    ALTER COLUMN cost_per_unit TYPE NUMERIC USING cost_per_unit::numeric,
    ALTER COLUMN line_cost TYPE NUMERIC USING line_cost::numeric;
  `;
}

async function saveInvoice(
  tx: postgres.TransactionSql,
  currentUser: CurrentUser,
  body: InvoiceConfirmBody,
  vendorName: string,
): Promise<InvoiceRow> {
  const invoiceId = cleanText(body.invoiceId);
  const invoiceNumber = cleanText(body.invoiceNumber ?? body.invoice_number);
  const invoiceDate = cleanDate(body.invoiceDate ?? body.invoice_date);
  const subtotal = toNumber(body.subtotal);
  const tax = toNumber(body.tax);
  const total = toNumber(body.total);
  const fileUrl = cleanText(body.fileUrl ?? body.file_url);
  const status = cleanText(body.status) || "confirmed";

  if (invoiceId && isUuid(invoiceId)) {
    const updatedInvoices = await tx<InvoiceRow[]>`
      UPDATE invoices
      SET
        vendor_name = ${vendorName},
        invoice_number = ${invoiceNumber},
        invoice_date = ${invoiceDate},
        subtotal = ${subtotal},
        tax = ${tax},
        total = ${total},
        file_url = ${fileUrl},
        status = ${status},
        updated_at = NOW()
      WHERE id::text = ${invoiceId}
      AND company_id::text = ${currentUser.company_id}
      RETURNING
        id,
        company_id,
        vendor_name,
        invoice_number,
        invoice_date,
        subtotal,
        tax,
        total,
        file_url,
        status,
        created_at,
        updated_at;
    `;

    const updatedInvoice = updatedInvoices[0];

    if (!updatedInvoice) {
      throw new Error("Invoice not found.");
    }

    return updatedInvoice;
  }

  const insertedInvoices = await tx<InvoiceRow[]>`
    INSERT INTO invoices (
      id,
      company_id,
      vendor_name,
      invoice_number,
      invoice_date,
      subtotal,
      tax,
      total,
      file_url,
      status,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${currentUser.company_id},
      ${vendorName},
      ${invoiceNumber},
      ${invoiceDate},
      ${subtotal},
      ${tax},
      ${total},
      ${fileUrl},
      ${status},
      NOW(),
      NOW()
    )
    RETURNING
      id,
      company_id,
      vendor_name,
      invoice_number,
      invoice_date,
      subtotal,
      tax,
      total,
      file_url,
      status,
      created_at,
      updated_at;
  `;

  const insertedInvoice = insertedInvoices[0];

  if (!insertedInvoice) {
    throw new Error("Invoice insert failed.");
  }

  return insertedInvoice;
}

async function findOrCreateIngredient(
  tx: postgres.TransactionSql,
  currentUser: CurrentUser,
  line: CleanInvoiceLine,
): Promise<{
  ingredient: IngredientRow;
  priceChanged: boolean;
  priceChange: PriceChangeResult;
}> {
  const cleanIngredientName = line.ingredientName || line.rawItemName;

  if (line.matchedIngredientId && isUuid(line.matchedIngredientId)) {
    const matchedRows = await tx<IngredientRow[]>`
      SELECT id, name, latest_cost, latest_unit, unit
      FROM ingredients
      WHERE id::text = ${line.matchedIngredientId}
      AND company_id::text = ${currentUser.company_id}
      LIMIT 1;
    `;

    const matchedIngredient = matchedRows[0];

    if (matchedIngredient) {
      return updateIngredientCost(tx, currentUser, matchedIngredient, line);
    }
  }

  const existingRows = await tx<IngredientRow[]>`
    SELECT id, name, latest_cost, latest_unit, unit
    FROM ingredients
    WHERE company_id::text = ${currentUser.company_id}
    AND LOWER(name) = LOWER(${cleanIngredientName})
    LIMIT 1;
  `;

  const existingIngredient = existingRows[0];

  if (existingIngredient) {
    return updateIngredientCost(tx, currentUser, existingIngredient, line);
  }

    const insertedRows = await tx<IngredientRow[]>`
    INSERT INTO ingredients (
      id,
      company_id,
      name,
      unit,
      latest_unit,
      latest_cost,
      vendor_name,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${currentUser.company_id},
      ${cleanIngredientName},
      ${line.unit},
      ${line.unit},
      ${line.unitCost},
      ${""},
      NOW(),
      NOW()
    )
    RETURNING id, name, latest_cost, latest_unit, unit;
  `; 

  const insertedIngredient = insertedRows[0];

  if (!insertedIngredient) {
    throw new Error("Ingredient insert failed.");
  }

  const priceChange = getPriceChangeResult(
    insertedIngredient.id,
    cleanIngredientName,
    0,
    line.unitCost,
  );

  return {
    ingredient: insertedIngredient,
    priceChanged: line.unitCost > 0,
    priceChange,
  };
}

async function updateIngredientCost(
  tx: postgres.TransactionSql,
  currentUser: CurrentUser,
  ingredient: IngredientRow,
  line: CleanInvoiceLine,
): Promise<{
  ingredient: IngredientRow;
  priceChanged: boolean;
  priceChange: PriceChangeResult;
}> {
  const oldCost = toNumber(ingredient.latest_cost);
  const newCost = line.unitCost;
  const priceChanged = newCost > 0 && oldCost !== newCost;
  const ingredientName = ingredient.name || line.ingredientName || line.rawItemName;
  const nextCost = newCost > 0 ? newCost : oldCost;

  const updatedRows = await tx<IngredientRow[]>`
    UPDATE ingredients
    SET
      latest_cost = ${nextCost},
      latest_unit = ${line.unit},
      unit = ${line.unit},
      updated_at = NOW()
    WHERE id::text = ${ingredient.id}
    AND company_id::text = ${currentUser.company_id}
    RETURNING id, name, latest_cost, latest_unit, unit;
  `;

  const updatedIngredient = updatedRows[0];

  if (!updatedIngredient) {
    throw new Error("Ingredient update failed.");
  }

  return {
    ingredient: updatedIngredient,
    priceChanged,
    priceChange: getPriceChangeResult(
      ingredient.id,
      ingredientName,
      oldCost,
      newCost,
    ),
  };
}

async function createPriceHistory(
  tx: postgres.TransactionSql,
  companyId: string,
  invoiceId: string,
  change: PriceChangeResult,
): Promise<void> {
  await tx`
    INSERT INTO price_history (
      id,
      company_id,
      ingredient_id,
      old_cost,
      new_cost,
      change_amount,
      change_percent,
      source,
      invoice_id,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${companyId},
      ${change.ingredientId},
      ${change.oldCost},
      ${change.newCost},
      ${change.changeAmount},
      ${change.changePercent},
      ${"invoice"},
      ${invoiceId},
      NOW()
    );
  `;
}

async function createCostAlert(
  tx: postgres.TransactionSql,
  companyId: string,
  invoiceId: string,
  change: PriceChangeResult,
): Promise<void> {
  if (change.changeAmount <= 0) {
    return;
  }

  await tx`
    INSERT INTO alerts (
      id,
      company_id,
      type,
      alert_type,
      title,
      message,
      severity,
      status,
      ingredient_id,
      invoice_id,
      ingredient_name,
      old_cost,
      new_cost,
      change_percent,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      ${companyId},
      ${"cost_increase"},
      ${"cost_increase"},
      ${`${change.ingredientName} cost increased`},
      ${`${change.ingredientName} increased from $${change.oldCost.toFixed(2)} to $${change.newCost.toFixed(2)}. This may impact recipe and event profit.`},
      ${change.changePercent >= 10 ? "high" : "medium"},
      ${"open"},
      ${change.ingredientId},
      ${invoiceId},
      ${change.ingredientName},
      ${change.oldCost},
      ${change.newCost},
      ${change.changePercent},
      NOW()
    );
  `;
}

async function recalculateRecipesForIngredients(
  tx: postgres.TransactionSql,
  companyId: string,
  ingredientIds: string[],
): Promise<RecalculatedRecipeRow[]> {
  const recalculatedRecipes: RecalculatedRecipeRow[] = [];

  for (const ingredientId of ingredientIds) {
    await tx`
      UPDATE recipe_ingredients ri
      SET
        cost_per_unit = i.latest_cost,
        line_cost = COALESCE(ri.quantity, 0) * COALESCE(i.latest_cost, 0)
      FROM ingredients i
      WHERE ri.ingredient_id = i.id
      AND ri.company_id::text = ${companyId}
      AND i.company_id::text = ${companyId}
      AND i.id::text = ${ingredientId};
    `;

    const recipeRows = await tx<{ recipe_id: string }[]>`
      SELECT DISTINCT recipe_id
      FROM recipe_ingredients
      WHERE company_id::text = ${companyId}
      AND ingredient_id::text = ${ingredientId}
      AND recipe_id IS NOT NULL;
    `;

    for (const recipeRow of recipeRows) {
      const updatedRecipeRows = await tx<RecalculatedRecipeRow[]>`
        WITH recipe_cost AS (
          SELECT
            recipe_id,
            SUM(COALESCE(line_cost, 0)) AS total_food_cost
          FROM recipe_ingredients
          WHERE company_id::text = ${companyId}
          AND recipe_id::text = ${recipeRow.recipe_id}
          GROUP BY recipe_id
        )
        UPDATE recipes r
        SET
          total_food_cost = COALESCE(recipe_cost.total_food_cost, 0),
          cost_per_serving =
            CASE
              WHEN COALESCE(r.servings, 0) > 0
              THEN COALESCE(recipe_cost.total_food_cost, 0) / r.servings
              ELSE 0
            END,
          margin_percent =
            CASE
              WHEN COALESCE(r.selling_price, 0) > 0
              THEN (
                (
                  r.selling_price -
                  CASE
                    WHEN COALESCE(r.servings, 0) > 0
                    THEN COALESCE(recipe_cost.total_food_cost, 0) / r.servings
                    ELSE 0
                  END
                ) / r.selling_price
              ) * 100
              ELSE 0
            END,
          updated_at = NOW()
        FROM recipe_cost
        WHERE r.id = recipe_cost.recipe_id
        AND r.company_id::text = ${companyId}
        RETURNING
          r.id,
          r.name,
          r.total_food_cost,
          r.cost_per_serving,
          r.margin_percent;
      `;

      const updatedRecipe = updatedRecipeRows[0];

      if (updatedRecipe) {
        recalculatedRecipes.push(updatedRecipe);
      }
    }
  }

  return removeDuplicateRecipes(recalculatedRecipes);
}

function normalizeInvoiceLines(lines: InvoiceConfirmLineInput[]): CleanInvoiceLine[] {
  return lines
    .map((line) => {
      const rawItemName = cleanText(
        line.rawItemName ?? line.raw_item_name ?? line.itemText ?? line.item_text,
      );
      const itemText =
        cleanText(line.itemText ?? line.item_text ?? line.rawItemName ?? line.raw_item_name) ||
        rawItemName;
      const ingredientName =
        cleanText(line.ingredientName ?? line.ingredient_name) || rawItemName;
      const quantity = toNumber(line.quantity);
      const unit = cleanText(line.unit) || "unit";
      const packSize = cleanText(line.packSize ?? line.pack_size);
      const unitCost = toNumber(line.unitCost ?? line.unit_cost);
      const totalCost =
        toNumber(line.totalCost ?? line.total_cost) > 0
          ? toNumber(line.totalCost ?? line.total_cost)
          : quantity * unitCost;

      return {
        rawItemName,
        itemText,
        ingredientName,
        matchedIngredientId:
          cleanText(line.matchedIngredientId ?? line.matched_ingredient_id) || null,
        quantity: quantity > 0 ? quantity : 1,
        unit,
        packSize,
        unitCost,
        totalCost,
      };
    })
    .filter((line) => line.rawItemName.length > 0 || line.ingredientName.length > 0);
}

function getPriceChangeResult(
  ingredientId: string,
  ingredientName: string,
  oldCost: number,
  newCost: number,
): PriceChangeResult {
  const changeAmount = newCost - oldCost;
  const changePercent = oldCost > 0 ? (changeAmount / oldCost) * 100 : 0;

  return {
    ingredientId,
    ingredientName,
    oldCost,
    newCost,
    changeAmount,
    changePercent,
  };
}

function removeDuplicateRecipes(
  recipes: RecalculatedRecipeRow[],
): RecalculatedRecipeRow[] {
  const seen = new Set<string>();
  const uniqueRecipes: RecalculatedRecipeRow[] = [];

  for (const recipe of recipes) {
    if (!seen.has(recipe.id)) {
      seen.add(recipe.id);
      uniqueRecipes.push(recipe);
    }
  }

  return uniqueRecipes;
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const date = new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%\s,]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Invoice confirm failed.";
}

function getStatusCode(error: unknown): number {
  if (error instanceof Error && error.message === "Not authenticated") {
    return 401;
  }

  if (error instanceof Error && error.message === "Invoice not found.") {
    return 404;
  }

  return 500;
}