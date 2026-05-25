import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
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

type SqlValue = string | number | boolean | Date | null;

type SqlRow = Record<string, unknown>;

type InvoiceRow = {
  id: string;
  company_id: string;
  status: string | null;
};

type InvoiceLineRow = {
  id: string;
  invoice_id: string;
  company_id: string;
  ingredient_id: string | null;
  item_name: string | null;
  description: string | null;
  quantity: string | number | null;
  unit: string | null;
  unit_price: string | number | null;
  line_total: string | number | null;
  category: string | null;
  status: string | null;
};

type IngredientRow = {
  id: string;
  name: string;
  latest_cost: string | number | null;
  unit: string | null;
};

type RecipeRecalcResult = {
  recipeId: string;
  recipeName: string;
  totalFoodCost: number;
  costPerServing: number;
  foodCostPercent: number;
  marginPercent: number;
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
  recalculatedRecipes: RecipeRecalcResult[];
};

type ConfirmInvoiceResponse = {
  success: boolean;
  invoiceId?: string;
  status?: string;
  processedLineCount?: number;
  linesProcessed?: number;
  skippedLineCount?: number;
  recipeRecalcCount?: number;
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

function cleanText(value: string | null | undefined): string {
  return value?.trim() || "";
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function quoteIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  return `"${value}"`;
}

function isFoodCategory(category: string | null): boolean {
  const normalized = cleanText(category).toLowerCase();

  return (
    normalized === "" ||
    normalized === "food_ingredient" ||
    normalized === "food ingredient" ||
    normalized === "ingredient"
  );
}

function getLineUnitCost(line: InvoiceLineRow): number {
  const quantity = toNumber(line.quantity);
  const unitPrice = toNumber(line.unit_price);
  const lineTotal = toNumber(line.line_total);

  if (unitPrice > 0) {
    return unitPrice;
  }

  if (quantity > 0 && lineTotal > 0) {
    return Number((lineTotal / quantity).toFixed(4));
  }

  return lineTotal;
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

function readString(row: SqlRow, key: string): string {
  const value = row[key];

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function readNumber(row: SqlRow, key: string): number {
  const value = row[key];

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    return toNumber(value);
  }

  return 0;
}

async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = (await getCurrentUser()) as CurrentUser | null;

  if (!currentUser?.company_id) {
    throw new Error("Unauthorized: missing company_id");
  }

  return currentUser;
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ) AS exists
  `;

  return rows[0]?.exists === true;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await sql<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = ${tableName}
  `;

  return new Set(rows.map((row) => row.column_name));
}

async function insertFlexibleRow(
  tableName: string,
  data: Record<string, SqlValue>,
): Promise<string | null> {
  const exists = await tableExists(tableName);

  if (!exists) {
    return null;
  }

  const columns = await getTableColumns(tableName);
  const entries = Object.entries(data).filter(([column]) => columns.has(column));

  if (entries.length === 0) {
    return null;
  }

  const columnSql = entries.map(([column]) => quoteIdentifier(column)).join(", ");
  const valueSql = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);

  const query = `
    INSERT INTO ${quoteIdentifier(tableName)} (${columnSql})
    VALUES (${valueSql})
    RETURNING id::text
  `;

  const rows = (await sql.unsafe(query, values)) as SqlRow[];

  return readString(rows[0] ?? {}, "id") || null;
}

async function updateFlexibleRowById(
  tableName: string,
  id: string,
  companyId: string,
  data: Record<string, SqlValue>,
): Promise<void> {
  const exists = await tableExists(tableName);

  if (!exists) {
    return;
  }

  const columns = await getTableColumns(tableName);
  const entries = Object.entries(data).filter(([column]) => columns.has(column));

  if (entries.length === 0) {
    return;
  }

  const setSql = entries
    .map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`)
    .join(", ");
  const values = entries.map(([, value]) => value);

  const query = `
    UPDATE ${quoteIdentifier(tableName)}
    SET ${setSql}
    WHERE id::text = $${values.length + 1}
    AND company_id::text = $${values.length + 2}
  `;

  await sql.unsafe(query, [...values, id, companyId]);
}

async function findOrCreateIngredient(
  companyId: string,
  itemName: string,
  unit: string,
  newCost: number,
): Promise<IngredientRow> {
  const cleanName = itemName.trim() || "Unknown Item";
  const normalizedName = normalizeName(cleanName);
  const columns = await getTableColumns("ingredients");
  const nameColumn = columns.has("name") ? "name" : "ingredient_name";
  const costColumn = columns.has("latest_cost")
    ? "latest_cost"
    : columns.has("unit_cost")
      ? "unit_cost"
      : columns.has("current_cost")
        ? "current_cost"
        : "";
  const unitColumn = columns.has("unit") ? "unit" : "";

  const selectCost = costColumn ? `${quoteIdentifier(costColumn)} AS latest_cost` : "0 AS latest_cost";
  const selectUnit = unitColumn ? `${quoteIdentifier(unitColumn)} AS unit` : "NULL AS unit";

  const existingQuery = `
    SELECT
      id::text,
      ${quoteIdentifier(nameColumn)}::text AS name,
      ${selectCost},
      ${selectUnit}
    FROM ingredients
    WHERE company_id::text = $1
    AND LOWER(${quoteIdentifier(nameColumn)}::text) = $2
    LIMIT 1
  `;

  const existingRows = (await sql.unsafe(existingQuery, [
    companyId,
    normalizedName,
  ])) as SqlRow[];

  const existing = existingRows[0];

  if (existing) {
    return {
      id: readString(existing, "id"),
      name: readString(existing, "name"),
      latest_cost: readNumber(existing, "latest_cost"),
      unit: readString(existing, "unit") || unit || "unit",
    };
  }

  const ingredientId =
    (await insertFlexibleRow("ingredients", {
      id: randomUUID(),
      company_id: companyId,
      name: cleanName,
      ingredient_name: cleanName,
      category: "Food",
      unit: unit || "unit",
      latest_cost: newCost,
      unit_cost: newCost,
      current_cost: newCost,
      created_at: new Date(),
      updated_at: new Date(),
    })) ?? randomUUID();

  return {
    id: ingredientId,
    name: cleanName,
    latest_cost: newCost,
    unit: unit || "unit",
  };
}

async function updateIngredientCost(
  companyId: string,
  ingredientId: string,
  unit: string,
  newCost: number,
): Promise<void> {
  await updateFlexibleRowById("ingredients", ingredientId, companyId, {
    latest_cost: newCost,
    unit_cost: newCost,
    current_cost: newCost,
    unit,
    updated_at: new Date(),
  });
}

async function createPriceHistory(
  companyId: string,
  ingredientId: string,
  ingredientName: string,
  invoiceId: string,
  oldCost: number,
  newCost: number,
): Promise<void> {
  const changeAmount = Number((newCost - oldCost).toFixed(4));
  const changePercent = getChangePercent(oldCost, newCost);

  await insertFlexibleRow("price_history", {
    id: randomUUID(),
    company_id: companyId,
    ingredient_id: ingredientId,
    ingredient_name: ingredientName,
    invoice_id: invoiceId,
    old_cost: oldCost,
    new_cost: newCost,
    change_amount: changeAmount,
    change_percent: changePercent,
    source_type: "invoice_confirm",
    source: "invoice_confirm",
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function createCostAlert(
  companyId: string,
  ingredientId: string,
  ingredientName: string,
  oldCost: number,
  newCost: number,
): Promise<boolean> {
  if (!shouldCreateAlert(oldCost, newCost)) {
    return false;
  }

  const changeAmount = Number((newCost - oldCost).toFixed(4));
  const changePercent = getChangePercent(oldCost, newCost);

  await insertFlexibleRow("alerts", {
    id: randomUUID(),
    company_id: companyId,
    title: `${ingredientName} cost increased`,
    message: `${ingredientName} increased from $${oldCost.toFixed(
      2,
    )} to $${newCost.toFixed(2)}. Review recipe and event margins.`,
    alert_type: "PRICE_INCREASE",
    type: "PRICE_INCREASE",
    severity: "warning",
    status: "open",
    ingredient_id: ingredientId,
    ingredient_name: ingredientName,
    old_cost: oldCost,
    new_cost: newCost,
    change_amount: changeAmount,
    change_percent: changePercent,
    created_at: new Date(),
    updated_at: new Date(),
  });

  return true;
}

async function updateInvoiceLineStatus(
  companyId: string,
  invoiceId: string,
  lineId: string,
  ingredientId: string | null,
  status: string,
): Promise<void> {
  const columns = await getTableColumns("invoice_lines");
  const data: Record<string, SqlValue> = {
    status,
    updated_at: new Date(),
  };

  if (ingredientId && columns.has("ingredient_id")) {
    data.ingredient_id = ingredientId;
  }

  const entries = Object.entries(data).filter(([column]) => columns.has(column));

  if (entries.length === 0) {
    return;
  }

  const setSql = entries
    .map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`)
    .join(", ");
  const values = entries.map(([, value]) => value);

  const query = `
    UPDATE invoice_lines
    SET ${setSql}
    WHERE id::text = $${values.length + 1}
    AND invoice_id::text = $${values.length + 2}
    AND company_id::text = $${values.length + 3}
  `;

  await sql.unsafe(query, [...values, lineId, invoiceId, companyId]);
}

async function updateRecipeIngredientCosts(
  companyId: string,
  ingredientId: string,
  newCost: number,
): Promise<string[]> {
  const exists = await tableExists("recipe_ingredients");

  if (!exists) {
    return [];
  }

  const columns = await getTableColumns("recipe_ingredients");
  const hasRecipeId = columns.has("recipe_id");
  const hasQuantity = columns.has("quantity");

  if (!hasRecipeId || !hasQuantity) {
    return [];
  }

  const rows = (await sql.unsafe(
    `
      SELECT
        id::text,
        recipe_id::text,
        quantity
      FROM recipe_ingredients
      WHERE company_id::text = $1
      AND ingredient_id::text = $2
    `,
    [companyId, ingredientId],
  )) as SqlRow[];

  const recipeIds = new Set<string>();

  for (const row of rows) {
    const recipeIngredientId = readString(row, "id");
    const recipeId = readString(row, "recipe_id");
    const quantity = readNumber(row, "quantity");
    const lineCost = Number((quantity * newCost).toFixed(4));

    if (recipeId) {
      recipeIds.add(recipeId);
    }

    if (recipeIngredientId) {
      await updateFlexibleRowById(
        "recipe_ingredients",
        recipeIngredientId,
        companyId,
        {
          unit_cost: newCost,
          latest_cost: newCost,
          line_cost: lineCost,
          total_cost: lineCost,
          updated_at: new Date(),
        },
      );
    }
  }

  return Array.from(recipeIds);
}

async function recalculateRecipe(
  companyId: string,
  recipeId: string,
): Promise<RecipeRecalcResult | null> {
  const recipeIngredientsExists = await tableExists("recipe_ingredients");
  const recipesExists = await tableExists("recipes");

  if (!recipeIngredientsExists || !recipesExists) {
    return null;
  }

  const recipeIngredientColumns = await getTableColumns("recipe_ingredients");
  const costExpression = recipeIngredientColumns.has("line_cost")
    ? "COALESCE(line_cost, 0)"
    : recipeIngredientColumns.has("total_cost")
      ? "COALESCE(total_cost, 0)"
      : recipeIngredientColumns.has("unit_cost")
        ? "COALESCE(quantity, 0) * COALESCE(unit_cost, 0)"
        : recipeIngredientColumns.has("latest_cost")
          ? "COALESCE(quantity, 0) * COALESCE(latest_cost, 0)"
          : "0";

  const totalRows = (await sql.unsafe(
    `
      SELECT COALESCE(SUM(${costExpression}), 0) AS total_food_cost
      FROM recipe_ingredients
      WHERE company_id::text = $1
      AND recipe_id::text = $2
    `,
    [companyId, recipeId],
  )) as SqlRow[];

  const totalFoodCost = Number(readNumber(totalRows[0] ?? {}, "total_food_cost").toFixed(4));

  const recipeColumns = await getTableColumns("recipes");
  const nameSelect = recipeColumns.has("name")
    ? "name::text AS recipe_name"
    : recipeColumns.has("recipe_name")
      ? "recipe_name::text AS recipe_name"
      : "'Recipe' AS recipe_name";
  const servingsSelect = recipeColumns.has("servings")
    ? "servings"
    : recipeColumns.has("yield")
      ? "yield"
      : "1 AS servings";
  const sellingPriceSelect = recipeColumns.has("selling_price")
    ? "selling_price"
    : recipeColumns.has("price_per_serving")
      ? "price_per_serving"
      : "0 AS selling_price";

  const recipeRows = (await sql.unsafe(
    `
      SELECT
        id::text,
        ${nameSelect},
        ${servingsSelect} AS servings,
        ${sellingPriceSelect} AS selling_price
      FROM recipes
      WHERE company_id::text = $1
      AND id::text = $2
      LIMIT 1
    `,
    [companyId, recipeId],
  )) as SqlRow[];

  const recipe = recipeRows[0];

  if (!recipe) {
    return null;
  }

  const servings = Math.max(readNumber(recipe, "servings"), 1);
  const sellingPrice = readNumber(recipe, "selling_price");
  const costPerServing = Number((totalFoodCost / servings).toFixed(4));
  const foodCostPercent =
    sellingPrice > 0 ? Number(((costPerServing / sellingPrice) * 100).toFixed(2)) : 0;
  const marginPercent =
    sellingPrice > 0
      ? Number((((sellingPrice - costPerServing) / sellingPrice) * 100).toFixed(2))
      : 0;

  await updateFlexibleRowById("recipes", recipeId, companyId, {
    total_food_cost: totalFoodCost,
    total_cost: totalFoodCost,
    cost_per_serving: costPerServing,
    food_cost_percent: foodCostPercent,
    margin_percent: marginPercent,
    current_margin_percent: marginPercent,
    updated_at: new Date(),
  });

  return {
    recipeId,
    recipeName: readString(recipe, "recipe_name") || "Recipe",
    totalFoodCost,
    costPerServing,
    foodCostPercent,
    marginPercent,
  };
}

async function recalculateRecipesForIngredient(
  companyId: string,
  ingredientId: string,
  newCost: number,
): Promise<RecipeRecalcResult[]> {
  const recipeIds = await updateRecipeIngredientCosts(companyId, ingredientId, newCost);
  const results: RecipeRecalcResult[] = [];

  for (const recipeId of recipeIds) {
    const result = await recalculateRecipe(companyId, recipeId);

    if (result) {
      results.push(result);
    }
  }

  return results;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<ConfirmInvoiceResponse>> {
  try {
    const currentUser = await requireCurrentUser();
    const { invoiceId } = await context.params;

    const invoiceRows = await sql<InvoiceRow[]>`
      SELECT
        id::text,
        company_id::text,
        status
      FROM invoices
      WHERE id::text = ${invoiceId}
      AND company_id::text = ${currentUser.company_id}
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
        id::text,
        invoice_id::text,
        company_id::text,
        ingredient_id::text,
        item_name,
        description,
        quantity,
        unit,
        unit_price,
        line_total,
        category,
        status
      FROM invoice_lines
      WHERE invoice_id::text = ${invoiceId}
      AND company_id::text = ${currentUser.company_id}
      ORDER BY created_at ASC NULLS LAST
    `;

    const foodLines = allInvoiceLines.filter((line) => isFoodCategory(line.category));
    const skippedLines = allInvoiceLines.filter((line) => !isFoodCategory(line.category));
    const results: EngineResult[] = [];
    const recipeIdsRecalculated = new Set<string>();

    for (const line of foodLines) {
      const itemName =
        cleanText(line.item_name) ||
        cleanText(line.description) ||
        "Unknown Invoice Item";
      const unit = cleanText(line.unit) || "unit";
      const newCost = getLineUnitCost(line);

      if (newCost <= 0) {
        await updateInvoiceLineStatus(
          currentUser.company_id,
          invoiceId,
          line.id,
          null,
          "needs_review",
        );

        continue;
      }

      const ingredient = await findOrCreateIngredient(
        currentUser.company_id,
        itemName,
        unit,
        newCost,
      );

      const oldCost = toNumber(ingredient.latest_cost);
      const changeAmount = Number((newCost - oldCost).toFixed(4));
      const changePercent = getChangePercent(oldCost, newCost);

      await updateIngredientCost(currentUser.company_id, ingredient.id, unit, newCost);

      await createPriceHistory(
        currentUser.company_id,
        ingredient.id,
        ingredient.name || itemName,
        invoiceId,
        oldCost,
        newCost,
      );

      const alertCreated = await createCostAlert(
        currentUser.company_id,
        ingredient.id,
        ingredient.name || itemName,
        oldCost,
        newCost,
      );

      const recalculatedRecipes = await recalculateRecipesForIngredient(
        currentUser.company_id,
        ingredient.id,
        newCost,
      );

      for (const recipe of recalculatedRecipes) {
        recipeIdsRecalculated.add(recipe.recipeId);
      }

      await updateInvoiceLineStatus(
        currentUser.company_id,
        invoiceId,
        line.id,
        ingredient.id,
        "processed",
      );

      results.push({
        lineId: line.id,
        itemName,
        ingredientId: ingredient.id,
        oldCost,
        newCost,
        changeAmount,
        changePercent,
        alertCreated,
        recalculatedRecipes,
      });
    }

    for (const line of skippedLines) {
      await updateInvoiceLineStatus(
        currentUser.company_id,
        invoiceId,
        line.id,
        line.ingredient_id,
        "skipped",
      );
    }

    await sql`
      UPDATE invoices
      SET
        status = 'confirmed',
        updated_at = NOW()
      WHERE id::text = ${invoiceId}
      AND company_id::text = ${currentUser.company_id}
    `;

    return NextResponse.json({
      success: true,
      invoiceId,
      status: "confirmed",
      processedLineCount: results.length,
      linesProcessed: results.length,
      skippedLineCount: skippedLines.length,
      recipeRecalcCount: recipeIdsRecalculated.size,
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