import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Pool, PoolClient } from "pg";
import { getSessionFromRequest } from "../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DbValue = string | number | Date | null;

type ColumnRow = {
  column_name: string;
};

type IdRow = {
  id: string;
};

type IngredientRow = {
  id: string;
  name: string;
  unit: string | null;
  unit_cost: string | number | null;
  previous_unit_cost?: string | number | null;
};

type RecipeCategory =
  | "Entree"
  | "Side"
  | "Appetizer"
  | "Dessert"
  | "Sauce"
  | "Beverage"
  | "Other";

type ImportIngredientLine = {
  ingredientId: string | null;
  ingredientName: string;
  quantity: number;
  unit: string | null;
  unitCost: number;
};

type SavedIngredientLine = {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string | null;
  unitCost: number;
  lineCost: number;
};

type ImportPriceReviewBody = {
  name?: unknown;
  recipeName?: unknown;
  recipe_name?: unknown;
  category?: unknown;
  servings?: unknown;
  sellingPrice?: unknown;
  selling_price?: unknown;
  laborCostPerServing?: unknown;
  labor_cost_per_serving?: unknown;
  overheadFeePerServing?: unknown;
  overhead_fee_per_serving?: unknown;
  targetMarginPercent?: unknown;
  target_margin_percent?: unknown;
  ingredientLines?: unknown;
  ingredient_lines?: unknown;
  ingredients?: unknown;
};

type RecipeResponse = {
  id: string;
  name: string;
  recipe_name: string;
  category: RecipeCategory;
  servings: number;
  sellingPrice: number;
  selling_price: number;
  totalCost: number;
  totalFoodCost: number;
  total_food_cost: number;
  productCost: number;
  product_cost: number;
  costPerServing: number;
  foodCostPerServing: number;
  food_cost_per_serving: number;
  foodCostPercent: number;
  food_cost_percent: number;
  laborCostPerServing: number;
  labor_cost_per_serving: number;
  overheadFeePerServing: number;
  overhead_fee_per_serving: number;
  loadedCostPerServing: number;
  loaded_cost_per_serving: number;
  loadedProfitPerServing: number;
  loaded_profit_per_serving: number;
  marginPercent: number;
  margin_percent: number;
  suggestedSellingPrice: number;
  suggested_selling_price: number;
  status: "Good margin" | "Low margin";
};

const databaseUrl = process.env.DATABASE_URL ?? "";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.length > 0 && !databaseUrl.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
});

const recipeCategories: RecipeCategory[] = [
  "Entree",
  "Side",
  "Appetizer",
  "Dessert",
  "Sauce",
  "Beverage",
  "Other",
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is missing" },
      { status: 500 },
    );
  }

  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Not logged in" },
      { status: 401 },
    );
  }

  let client: PoolClient | null = null;
  let transactionStarted = false;

  try {
    const body = (await request.json()) as ImportPriceReviewBody;

    console.log("IMPORT PRICE REVIEW BODY:", {
      name: body.name,
      recipeName: body.recipeName,
      recipe_name: body.recipe_name,
      category: body.category,
      servings: body.servings,
    });

    const name =
      getString(body.name) ??
      getString(body.recipeName) ??
      getString(body.recipe_name);

    const category = normalizeRecipeCategory(getString(body.category));
    const servings = getNumber(body.servings) ?? 1;

    const sellingPrice =
      getNumber(body.sellingPrice) ?? getNumber(body.selling_price) ?? 0;
      
    console.log("NORMALIZED IMPORT VALUES:", { 
      name, 
      category, 
      servings, 
      sellingPrice, 
    });

    const laborCostPerServing =
      getNumber(body.laborCostPerServing) ??
      getNumber(body.labor_cost_per_serving) ??
      0;

    const overheadFeePerServing =
      getNumber(body.overheadFeePerServing) ??
      getNumber(body.overhead_fee_per_serving) ??
      0;

    const targetMarginPercent =
      getNumber(body.targetMarginPercent) ??
      getNumber(body.target_margin_percent) ??
      65;

    const ingredientLines = parseIngredientLines(
      body.ingredientLines ?? body.ingredient_lines ?? body.ingredients,
    );

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Recipe name is required" },
        { status: 400 },
      );
    }

    if (servings <= 0) {
      return NextResponse.json(
        { success: false, error: "Servings must be greater than 0" },
        { status: 400 },
      );
    }

    if (ingredientLines.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ingredient lines are required" },
        { status: 400 },
      );
    }

    const missingPrices = ingredientLines.filter((line) => line.unitCost <= 0);

    if (missingPrices.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Every imported ingredient needs a price before saving.",
          missingPrices: missingPrices.map((line) => line.ingredientName),
        },
        { status: 400 },
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    await ensureRecipeCoreColumns(client);
    async function ensureAlertCoreColumns(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY,
      company_id UUID NOT NULL,
      title TEXT,
      message TEXT,
      type TEXT,
      severity TEXT,
      status TEXT,
      source TEXT,
      source_type TEXT,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    )
  `);
}

async function createCostAlert(
  client: PoolClient,
  input: {
    companyId: string;
    ingredientName: string;
    oldCost: number;
    newCost: number;
    recipeName: string;
  },
): Promise<void> {
  if (input.oldCost <= 0 || input.newCost <= input.oldCost) {
    return;
  }

  const changeAmount = roundNumber(input.newCost - input.oldCost);
  const changePercent = roundNumber((changeAmount / input.oldCost) * 100);

  await insertRow(client, "alerts", {
    id: randomUUID(),
    company_id: input.companyId,
    title: `${input.ingredientName} cost increased`,
    message: `${input.ingredientName} increased from $${input.oldCost.toFixed(2)} to $${input.newCost.toFixed(2)}. This may affect ${input.recipeName}.`,
    type: "cost_increase",
    severity: changePercent >= 10 ? "high" : "medium",
    status: "open",
    source: "recipe_import_price_review",
    source_type: "recipe_import",
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log("COST ALERT CREATED:", {
    ingredientName: input.ingredientName,
    oldCost: input.oldCost,
    newCost: input.newCost,
    changeAmount,
    changePercent,
  });
}
    await ensureAlertCoreColumns(client);

    const duplicateRecipeIds = await findDuplicateRecipeIds(client, {
      companyId: session.company_id,
      name,
    });

    const savedIngredientLines: SavedIngredientLine[] = [];

    for (const line of ingredientLines) {
      const ingredient = await upsertIngredientPrice(client, {
        companyId: session.company_id,
        ingredientId: line.ingredientId,
        ingredientName: line.ingredientName,
        unit: line.unit,
        unitCost: line.unitCost,
      });
      
      const savedLine: SavedIngredientLine = {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        quantity: line.quantity,
        unit: line.unit ?? ingredient.unit,
        unitCost: line.unitCost,
        lineCost: roundNumber(line.quantity * line.unitCost),
      };

      savedIngredientLines.push(savedLine);

       const oldCost = Number(ingredient.previous_unit_cost ?? 0); 

      await createPriceHistory(client, {
        companyId: session.company_id,
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        unit: savedLine.unit,
        oldCost,
        newCost: savedLine.unitCost,
      });

      await createCostAlert(client, { 
        companyId: session.company_id, 
        ingredientName: ingredient.name, 
        oldCost, 
        newCost: savedLine.unitCost, 
        recipeName: name, 
      });
    }

    const totalCost = roundNumber(
      savedIngredientLines.reduce((sum, line) => sum + line.lineCost, 0),
    );

    const calculated = buildRecipeResponse({
      id: "",
      name,
      category,
      servings,
      sellingPrice,
      totalCost,
      laborCostPerServing,
      overheadFeePerServing,
      targetMarginPercent,
    });

    let recipeId: string | null = duplicateRecipeIds[0] ?? null;

    if (recipeId) {
      for (const existingRecipeId of duplicateRecipeIds) {
        await updateRow(
          client,
          "recipes",
          {
            name,
            recipe_name: name,
            category,
            recipe_category: category,
            category_name: category,
            servings,
            serving_count: servings,
            servings_count: servings,
            yield_count: servings,
            "yield": servings,
            selling_price: calculated.sellingPrice,
            price_per_serving: calculated.sellingPrice,
            total_cost: calculated.totalCost,
            total_food_cost: calculated.totalFoodCost,
            product_cost: calculated.productCost,
            cost_per_serving: calculated.costPerServing,
            food_cost_per_serving: calculated.foodCostPerServing,
            food_cost_percent: calculated.foodCostPercent,
            labor_cost_per_serving: calculated.laborCostPerServing,
            overhead_fee_per_serving: calculated.overheadFeePerServing,
            loaded_cost: calculated.loadedCostPerServing,
            loaded_cost_per_serving: calculated.loadedCostPerServing,
            loaded_profit: calculated.loadedProfitPerServing,
            loaded_profit_per_serving: calculated.loadedProfitPerServing,
            margin_percent: calculated.marginPercent,
            current_margin_percent: calculated.marginPercent,
            suggested_selling_price: calculated.suggestedSellingPrice,
            suggested_price: calculated.suggestedSellingPrice,
            target_margin_percent: targetMarginPercent,
            status: "active",
            updated_at: new Date(),
          },
          "WHERE id = $1 AND company_id = $2",
          [existingRecipeId, session.company_id],
        );
      }

      await deleteRecipeIngredientLines(client, {
        companyId: session.company_id,
        recipeIds: duplicateRecipeIds,
      });
    } else {
      const recipeRows = await insertRow(client, "recipes", {
        id: randomUUID(),
        company_id: session.company_id,
        name,
        recipe_name: name,
        category,
        recipe_category: category,
        category_name: category,
        servings,
        serving_count: servings,
        servings_count: servings,
        yield_count: servings,
        "yield": servings,
        selling_price: calculated.sellingPrice,
        price_per_serving: calculated.sellingPrice,
        total_cost: calculated.totalCost,
        total_food_cost: calculated.totalFoodCost,
        product_cost: calculated.productCost,
        cost_per_serving: calculated.costPerServing,
        food_cost_per_serving: calculated.foodCostPerServing,
        food_cost_percent: calculated.foodCostPercent,
        labor_cost_per_serving: calculated.laborCostPerServing,
        overhead_fee_per_serving: calculated.overheadFeePerServing,
        loaded_cost: calculated.loadedCostPerServing,
        loaded_cost_per_serving: calculated.loadedCostPerServing,
        loaded_profit: calculated.loadedProfitPerServing,
        loaded_profit_per_serving: calculated.loadedProfitPerServing,
        margin_percent: calculated.marginPercent,
        current_margin_percent: calculated.marginPercent,
        suggested_selling_price: calculated.suggestedSellingPrice,
        suggested_price: calculated.suggestedSellingPrice,
        target_margin_percent: targetMarginPercent,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      });

      recipeId = recipeRows[0]?.id ?? null;
    }

    if (!recipeId) {
      throw new Error("Recipe was not created.");
    }

    for (const line of savedIngredientLines) {
      await insertRow(client, "recipe_ingredients", {
        id: randomUUID(),
        company_id: session.company_id,
        recipe_id: recipeId,
        ingredient_id: line.ingredientId,
        ingredient_name: line.ingredientName,
        quantity: line.quantity,
        unit: line.unit,
        unit_cost: line.unitCost,
        latest_cost: line.unitCost,
        line_cost: line.lineCost,
        total_cost: line.lineCost,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    await client.query("COMMIT");
    transactionStarted = false;

    console.log("IMPORT PRICE REVIEW SAVED:", {
      recipeId,
      category,
      servings,
      totalCost,
      updatedExistingRecipe: duplicateRecipeIds.length > 0,
    });

    return NextResponse.json({
      success: true,
      recipe: {
        ...calculated,
        id: recipeId,
      },
      ingredientCount: savedIngredientLines.length,
      updatedExistingRecipe: duplicateRecipeIds.length > 0,
    });
  } catch (error: unknown) {
    if (transactionStarted) {
      await client?.query("ROLLBACK").catch(() => undefined);
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save imported recipe price review.",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

async function ensureRecipeCoreColumns(client: PoolClient): Promise<void> {
  await client.query(`
    ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS recipe_name TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS recipe_category TEXT,
    ADD COLUMN IF NOT EXISTS category_name TEXT,
    ADD COLUMN IF NOT EXISTS servings NUMERIC,
    ADD COLUMN IF NOT EXISTS serving_count NUMERIC,
    ADD COLUMN IF NOT EXISTS servings_count NUMERIC,
    ADD COLUMN IF NOT EXISTS yield_count NUMERIC,
    ADD COLUMN IF NOT EXISTS "yield" NUMERIC,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC,
    ADD COLUMN IF NOT EXISTS price_per_serving NUMERIC,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC,
    ADD COLUMN IF NOT EXISTS total_food_cost NUMERIC,
    ADD COLUMN IF NOT EXISTS product_cost NUMERIC,
    ADD COLUMN IF NOT EXISTS cost_per_serving NUMERIC,
    ADD COLUMN IF NOT EXISTS food_cost_per_serving NUMERIC,
    ADD COLUMN IF NOT EXISTS food_cost_percent NUMERIC,
    ADD COLUMN IF NOT EXISTS labor_cost_per_serving NUMERIC,
    ADD COLUMN IF NOT EXISTS overhead_fee_per_serving NUMERIC,
    ADD COLUMN IF NOT EXISTS loaded_cost NUMERIC,
    ADD COLUMN IF NOT EXISTS loaded_cost_per_serving NUMERIC,
    ADD COLUMN IF NOT EXISTS loaded_profit NUMERIC,
    ADD COLUMN IF NOT EXISTS loaded_profit_per_serving NUMERIC,
    ADD COLUMN IF NOT EXISTS margin_percent NUMERIC,
    ADD COLUMN IF NOT EXISTS current_margin_percent NUMERIC,
    ADD COLUMN IF NOT EXISTS suggested_selling_price NUMERIC,
    ADD COLUMN IF NOT EXISTS suggested_price NUMERIC,
    ADD COLUMN IF NOT EXISTS target_margin_percent NUMERIC,
    ADD COLUMN IF NOT EXISTS status TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
  `);
}

async function findDuplicateRecipeIds(
  client: PoolClient,
  input: {
    companyId: string;
    name: string;
  },
): Promise<string[]> {
  const recipeColumns = await getColumns(client, "recipes");
  const nameChecks: string[] = [];

  if (recipeColumns.has("name")) {
    nameChecks.push(
      "LOWER(REGEXP_REPLACE(TRIM(name), '[[:space:]]+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM($2), '[[:space:]]+', ' ', 'g'))",
    );
  }

  if (recipeColumns.has("recipe_name")) {
    nameChecks.push(
      "LOWER(REGEXP_REPLACE(TRIM(recipe_name), '[[:space:]]+', ' ', 'g')) = LOWER(REGEXP_REPLACE(TRIM($2), '[[:space:]]+', ' ', 'g'))",
    );
  }

  if (nameChecks.length === 0) {
    return [];
  }

  const orderSql = recipeColumns.has("updated_at")
    ? "ORDER BY updated_at DESC NULLS LAST"
    : recipeColumns.has("created_at")
      ? "ORDER BY created_at DESC NULLS LAST"
      : "ORDER BY id ASC";

  const result = await client.query<IdRow>(
    `
      SELECT id
      FROM recipes
      WHERE company_id = $1
        AND (${nameChecks.join(" OR ")})
      ${orderSql}
    `,
    [input.companyId, input.name],
  );

  return result.rows.map((row) => row.id);
}

async function deleteRecipeIngredientLines(
  client: PoolClient,
  input: {
    companyId: string;
    recipeIds: string[];
  },
): Promise<void> {
  if (input.recipeIds.length === 0) {
    return;
  }

  const placeholders = input.recipeIds
    .map((_, index) => `$${index + 2}`)
    .join(", ");

  await client.query(
    `
      DELETE FROM recipe_ingredients
      WHERE company_id = $1
        AND recipe_id IN (${placeholders})
    `,
    [input.companyId, ...input.recipeIds],
  );
}

async function upsertIngredientPrice(
  client: PoolClient,
  input: {
    companyId: string;
    ingredientId: string | null;
    ingredientName: string;
    unit: string | null;
    unitCost: number;
  },
): Promise<IngredientRow> {
  const ingredientColumns = await getColumns(client, "ingredients");

  const nameColumn = ingredientColumns.has("name")
    ? "name"
    : ingredientColumns.has("ingredient_name")
      ? "ingredient_name"
      : null;

  if (!nameColumn) {
    throw new Error("ingredients table needs name or ingredient_name column.");
  }

  const unitCostSql = ingredientColumns.has("latest_cost")
    ? "latest_cost"
    : ingredientColumns.has("unit_cost")
      ? "unit_cost"
      : ingredientColumns.has("cost_per_unit")
        ? "cost_per_unit"
        : "0";

  const unitSql = ingredientColumns.has("unit") ? "unit" : "NULL";

  let existingIngredient: IngredientRow | null = null;

  if (input.ingredientId) {
    const byId = await client.query<IngredientRow>(
      `
        SELECT
          id,
          ${nameColumn} AS name,
          ${unitSql} AS unit,
          ${unitCostSql} AS unit_cost
        FROM ingredients
        WHERE id = $1
          AND company_id = $2
        LIMIT 1
      `,
      [input.ingredientId, input.companyId],
    );

    existingIngredient = byId.rows[0] ?? null;
  }

  if (!existingIngredient) {
    const byName = await client.query<IngredientRow>(
      `
        SELECT
          id,
          ${nameColumn} AS name,
          ${unitSql} AS unit,
          ${unitCostSql} AS unit_cost
        FROM ingredients
        WHERE company_id = $1
          AND LOWER(TRIM(${nameColumn})) = LOWER(TRIM($2))
        LIMIT 1
      `,
      [input.companyId, input.ingredientName],
    );

    existingIngredient = byName.rows[0] ?? null;
  }

  if (existingIngredient) {
    await updateRow(
      client,
      "ingredients",
      {
        name: input.ingredientName,
        ingredient_name: input.ingredientName,
        unit: input.unit,
        latest_cost: input.unitCost,
        unit_cost: input.unitCost,
        cost_per_unit: input.unitCost,
        updated_at: new Date(),
      },
      "WHERE id = $1 AND company_id = $2",
      [existingIngredient.id, input.companyId],
    );

    return {
      id: existingIngredient.id,
      name: input.ingredientName,
      unit: input.unit ?? existingIngredient.unit,
      unit_cost: input.unitCost,
      previous_unit_cost: existingIngredient.unit_cost,
    };
  }

  const ingredientRows = await insertRow(client, "ingredients", {
    id: randomUUID(),
    company_id: input.companyId,
    name: input.ingredientName,
    ingredient_name: input.ingredientName,
    unit: input.unit,
    latest_cost: input.unitCost,
    unit_cost: input.unitCost,
    cost_per_unit: input.unitCost,
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  });

  const ingredientId = ingredientRows[0]?.id;

  if (!ingredientId) {
    throw new Error(`Ingredient was not created: ${input.ingredientName}`);
  }

  return {
    id: ingredientId,
    name: input.ingredientName,
    unit: input.unit,
    unit_cost: input.unitCost,
    previous_unit_cost: 0,
  };
}

async function createPriceHistory(
  client: PoolClient,
  input: {
    companyId: string;
    ingredientId: string;
    ingredientName: string;
    unit: string | null;
    newCost: number;
    oldCost: number;
  },
): Promise<void> {
  const priceHistoryColumns = await getColumns(client, "price_history");

  if (priceHistoryColumns.size === 0) {
    return;
  }

  await insertRow(client, "price_history", {
    id: randomUUID(),
    company_id: input.companyId,
    ingredient_id: input.ingredientId,
    ingredient_name: input.ingredientName,
    name: input.ingredientName,
    unit: input.unit,
    old_cost: input.oldCost,
    new_cost: input.newCost,
    latest_cost: input.newCost,
    unit_cost: input.newCost,
    cost_per_unit: input.newCost,
    source: "recipe_import_price_review",
    source_type: "recipe_import",
    change_reason: "Imported recipe price review",
    created_at: new Date(),
    updated_at: new Date(),
  });
  
   console.log("PRICE HISTORY CREATED:", { 
    ingredientName: input.ingredientName, 
    oldCost: input.oldCost, 
    newCost: input.newCost, 
    changeAmount: roundNumber(input.newCost - input.oldCost), 
  }); 
}

async function insertRow(
  client: PoolClient,
  tableName: string,
  data: Record<string, DbValue>,
): Promise<IdRow[]> {
  const columns = await getColumns(client, tableName);
  const entries = Object.entries(data).filter(([column]) => columns.has(column));

  if (entries.length === 0) {
    throw new Error(`No matching columns found for ${tableName}.`);
  }

  const columnSql = entries.map(([column]) => `"${column}"`).join(", ");
  const valueSql = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);

  const result = await client.query<IdRow>(
    `
      INSERT INTO "${tableName}" (${columnSql})
      VALUES (${valueSql})
      RETURNING id
    `,
    values,
  );

  return result.rows;
}

async function updateRow(
  client: PoolClient,
  tableName: string,
  data: Record<string, DbValue>,
  whereSql: string,
  whereValues: DbValue[],
): Promise<void> {
  const columns = await getColumns(client, tableName);
  const entries = Object.entries(data).filter(([column]) => columns.has(column));

  if (entries.length === 0) {
    return;
  }

  const setSql = entries
    .map(([column], index) => `"${column}" = $${index + 1}`)
    .join(", ");

  const offsetWhereSql = whereSql.replace(
    /\$(\d+)/g,
    (_match, numberText: string) => {
      return `$${Number(numberText) + entries.length}`;
    },
  );

  const values = entries.map(([, value]) => value);

  await client.query(
    `
      UPDATE "${tableName}"
      SET ${setSql}
      ${offsetWhereSql}
    `,
    [...values, ...whereValues],
  );
}

async function getColumns(
  client: PoolClient,
  tableName: string,
): Promise<Set<string>> {
  const result = await client.query<ColumnRow>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );

  return new Set(result.rows.map((row) => row.column_name));
}

function parseIngredientLines(value: unknown): ImportIngredientLine[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ImportIngredientLine | null => {
      if (!isRecord(item)) {
        return null;
      }

      const ingredientId =
        getString(item.ingredientId) ?? getString(item.ingredient_id);

      const ingredientName =
        getString(item.ingredientName) ??
        getString(item.ingredient_name) ??
        getString(item.name);

      const quantity = getNumber(item.quantity);
      const unit = getString(item.unit);

      const unitCost =
        getNumber(item.unitCost) ??
        getNumber(item.unit_cost) ??
        getNumber(item.latestCost) ??
        getNumber(item.latest_cost) ??
        getNumber(item.price) ??
        0;

      if (!ingredientName || quantity === null || quantity <= 0) {
        return null;
      }

      return {
        ingredientId,
        ingredientName,
        quantity,
        unit,
        unitCost,
      };
    })
    .filter((item): item is ImportIngredientLine => item !== null);
}

function buildRecipeResponse(input: {
  id: string;
  name: string;
  category: RecipeCategory;
  servings: number;
  sellingPrice: number;
  totalCost: number;
  laborCostPerServing: number;
  overheadFeePerServing: number;
  targetMarginPercent: number;
}): RecipeResponse {
  const servings = input.servings > 0 ? input.servings : 1;
  const sellingPrice = input.sellingPrice > 0 ? input.sellingPrice : 0;
  const totalCost = roundNumber(input.totalCost);
  const costPerServing = roundNumber(totalCost / servings);
  const laborCostPerServing = roundNumber(input.laborCostPerServing);
  const overheadFeePerServing = roundNumber(input.overheadFeePerServing);
  const loadedCostPerServing = roundNumber(
    costPerServing + laborCostPerServing + overheadFeePerServing,
  );
  const loadedProfitPerServing = roundNumber(
    sellingPrice - loadedCostPerServing,
  );
  const foodCostPercent =
    sellingPrice > 0 ? roundNumber((costPerServing / sellingPrice) * 100) : 0;
  const marginPercent =
    sellingPrice > 0
      ? roundNumber((loadedProfitPerServing / sellingPrice) * 100)
      : 0;
  const targetMargin =
    input.targetMarginPercent > 0 && input.targetMarginPercent < 95
      ? input.targetMarginPercent
      : 65;
  const suggestedSellingPrice = roundMenuPrice(
    loadedCostPerServing / (1 - targetMargin / 100),
  );

  return {
    id: input.id,
    name: input.name,
    recipe_name: input.name,
    category: input.category,
    servings,
    sellingPrice,
    selling_price: sellingPrice,
    totalCost,
    totalFoodCost: totalCost,
    total_food_cost: totalCost,
    productCost: costPerServing,
    product_cost: costPerServing,
    costPerServing,
    foodCostPerServing: costPerServing,
    food_cost_per_serving: costPerServing,
    foodCostPercent,
    food_cost_percent: foodCostPercent,
    laborCostPerServing,
    labor_cost_per_serving: laborCostPerServing,
    overheadFeePerServing,
    overhead_fee_per_serving: overheadFeePerServing,
    loadedCostPerServing,
    loaded_cost_per_serving: loadedCostPerServing,
    loadedProfitPerServing,
    loaded_profit_per_serving: loadedProfitPerServing,
    marginPercent,
    margin_percent: marginPercent,
    suggestedSellingPrice,
    suggested_selling_price: suggestedSellingPrice,
    status: marginPercent >= 60 ? "Good margin" : "Low margin",
  };
}

function normalizeRecipeCategory(value: string | null): RecipeCategory {
  if (!value) {
    return "Other";
  }

  const match = recipeCategories.find(
    (category) => category.toLowerCase() === value.trim().toLowerCase(),
  );

  return match ?? "Other";
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundNumber(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundMenuPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const roundedWhole = Math.ceil(value);
  const menuPrice =
    roundedWhole - 0.01 >= value ? roundedWhole - 0.01 : roundedWhole + 0.99;

  return roundNumber(menuPrice);
}