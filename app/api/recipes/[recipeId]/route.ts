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

type RouteContext = {
  params: Promise<{
    recipeId: string;
  }>;
};

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

type RecipeIngredientInput = {
  id?: string | null;
  ingredientId?: string | null;
  ingredient_id?: string | null;
  rawIngredientName?: string;
  raw_ingredient_name?: string;
  name?: string;
  quantity?: number | string;
  unit?: string;
  costPerUnit?: number | string;
  cost_per_unit?: number | string;
  lineCost?: number | string;
  line_cost?: number | string;
  prepNote?: string;
  prep_note?: string;
  sortOrder?: number | string;
  sort_order?: number | string;
};

type PatchRecipeBody = {
  name?: string;
  recipeName?: string;
  category?: string;
  servings?: number | string;
  sellingPrice?: number | string;
  selling_price?: number | string;
  prepTimeMinutes?: number | string;
  prep_time_minutes?: number | string;
  cookTimeMinutes?: number | string;
  cook_time_minutes?: number | string;
  portionWeight?: number | string;
  portion_weight?: number | string;
  portionUnit?: string;
  portion_unit?: string;
  prepPhotoUrl?: string;
  prep_photo_url?: string;
  finalPlatePhotoUrl?: string;
  final_plate_photo_url?: string;
  instructions?: string;
  sourceType?: string;
  source_type?: string;
  ingredients?: RecipeIngredientInput[];
};

type RecipeRow = {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  servings: string | number | null;
  selling_price: string | number | null;
  total_food_cost: string | number | null;
  cost_per_serving: string | number | null;
  margin_percent: string | number | null;
  prep_time_minutes: string | number | null;
  cook_time_minutes: string | number | null;
  portion_weight: string | number | null;
  portion_unit: string | null;
  prep_photo_url: string | null;
  final_plate_photo_url: string | null;
  instructions: string | null;
  source_type: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

type RecipeIngredientRow = {
  id: string;
  company_id: string;
  recipe_id: string;
  ingredient_id: string | null;
  raw_ingredient_name: string | null;
  ingredient_name: string | null;
  quantity: string | number | null;
  unit: string | null;
  cost_per_unit: string | number | null;
  line_cost: string | number | null;
  prep_note: string | null;
  sort_order: string | number | null;
};

type RecipeWithIngredients = RecipeRow & {
  ingredients: RecipeIngredientRow[];
  recipe_ingredients: RecipeIngredientRow[];
};

type ApiResponse =
  | {
      success: true;
      recipe: RecipeWithIngredients;
      data: RecipeWithIngredients;
    }
  | {
      success: false;
      error: string;
    };

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<ApiResponse>> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureRecipeColumns();

    const { recipeId } = await context.params;

    if (!isUuid(recipeId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid recipe ID.",
        },
        { status: 400 },
      );
    }

    const recipe = await getRecipeWithIngredients(recipeId, currentUser.company_id);

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      recipe,
      data: recipe,
    });
  } catch (error: unknown) {
    console.error("GET /api/recipes/[recipeId] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getStatusCode(error) },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse<ApiResponse>> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureRecipeColumns();

    const { recipeId } = await context.params;

    if (!isUuid(recipeId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid recipe ID.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as PatchRecipeBody;

    const recipeName = cleanText(body.name ?? body.recipeName);

    if (!recipeName) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe name is required.",
        },
        { status: 400 },
      );
    }

    const cleanIngredients = normalizeIngredients(body.ingredients ?? []);

    if (cleanIngredients.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one ingredient is required.",
        },
        { status: 400 },
      );
    }

    const servings = Math.max(toNumber(body.servings), 1);
    const sellingPrice = toNumber(body.sellingPrice ?? body.selling_price);
    const totalFoodCost = cleanIngredients.reduce((sum, ingredient) => {
      return sum + ingredient.lineCost;
    }, 0);
    const costPerServing = totalFoodCost / servings;
    const profitPerServing = sellingPrice - costPerServing;
    const marginPercent =
      sellingPrice > 0 ? (profitPerServing / sellingPrice) * 100 : 0;

    await sql.begin(async (tx) => {
      const updatedRecipes = await tx<RecipeRow[]>`
        UPDATE recipes
        SET
          name = ${recipeName},
          category = ${cleanText(body.category) || "Other"},
          servings = ${servings},
          selling_price = ${sellingPrice},
          total_food_cost = ${totalFoodCost},
          cost_per_serving = ${costPerServing},
          margin_percent = ${marginPercent},
          prep_time_minutes = ${toNumber(body.prepTimeMinutes ?? body.prep_time_minutes)},
          cook_time_minutes = ${toNumber(body.cookTimeMinutes ?? body.cook_time_minutes)},
          portion_weight = ${toNumber(body.portionWeight ?? body.portion_weight)},
          portion_unit = ${cleanText(body.portionUnit ?? body.portion_unit) || "oz"},
          prep_photo_url = ${cleanText(body.prepPhotoUrl ?? body.prep_photo_url)},
          final_plate_photo_url = ${cleanText(body.finalPlatePhotoUrl ?? body.final_plate_photo_url)},
          instructions = ${cleanText(body.instructions)},
          source_type = ${cleanText(body.sourceType ?? body.source_type) || "manual"},
          updated_at = NOW()
        WHERE id::text = ${recipeId}
        AND company_id::text = ${currentUser.company_id}
        RETURNING
          id,
          company_id,
          name,
          category,
          servings,
          selling_price,
          total_food_cost,
          cost_per_serving,
          margin_percent,
          prep_time_minutes,
          cook_time_minutes,
          portion_weight,
          portion_unit,
          prep_photo_url,
          final_plate_photo_url,
          instructions,
          source_type,
          created_at,
          updated_at;
      `;

      const updatedRecipe = updatedRecipes[0];

      if (!updatedRecipe) {
        throw new Error("Recipe not found.");
      }

      await tx`
        DELETE FROM recipe_ingredients
        WHERE recipe_id::text = ${recipeId}
        AND company_id::text = ${currentUser.company_id};
      `;

      for (const ingredient of cleanIngredients) {
        const matchedIngredientId = await findOrCreateIngredient(
          tx,
          currentUser.company_id,
          ingredient.rawIngredientName,
          ingredient.unit,
          ingredient.costPerUnit,
        );

        await tx`
          INSERT INTO recipe_ingredients (
            id,
            company_id,
            recipe_id,
            ingredient_id,
            raw_ingredient_name,
            quantity,
            unit,
            cost_per_unit,
            line_cost,
            prep_note,
            sort_order
          )
          VALUES (
            gen_random_uuid(),
            ${currentUser.company_id},
            ${recipeId},
            ${matchedIngredientId},
            ${ingredient.rawIngredientName},
            ${ingredient.quantity},
            ${ingredient.unit},
            ${ingredient.costPerUnit},
            ${ingredient.lineCost},
            ${ingredient.prepNote},
            ${ingredient.sortOrder}
          );
        `;
      }
    });

    const recipe = await getRecipeWithIngredients(recipeId, currentUser.company_id);

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not found after update.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      recipe,
      data: recipe,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/recipes/[recipeId] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getStatusCode(error) },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureRecipeColumns();

    const { recipeId } = await context.params;

    if (!isUuid(recipeId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid recipe ID.",
        },
        { status: 400 },
      );
    }

    await sql.begin(async (tx) => {
      await tx`
        DELETE FROM recipe_ingredients
        WHERE recipe_id::text = ${recipeId}
        AND company_id::text = ${currentUser.company_id};
      `;

      const deletedRecipes = await tx<{ id: string }[]>`
        DELETE FROM recipes
        WHERE id::text = ${recipeId}
        AND company_id::text = ${currentUser.company_id}
        RETURNING id;
      `;

      if (!deletedRecipes[0]) {
        throw new Error("Recipe not found.");
      }
    });

    return NextResponse.json({
      success: true,
      message: "Recipe deleted.",
    });
  } catch (error: unknown) {
    console.error("DELETE /api/recipes/[recipeId] error:", error);

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

async function ensureRecipeColumns(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Other',
    ADD COLUMN IF NOT EXISTS servings NUMERIC DEFAULT 1,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_food_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cost_per_serving NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_percent NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prep_time_minutes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cook_time_minutes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS portion_weight NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS portion_unit TEXT DEFAULT 'oz',
    ADD COLUMN IF NOT EXISTS prep_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS final_plate_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS instructions TEXT,
    ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE ingredients
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'lb',
    ADD COLUMN IF NOT EXISTS latest_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE recipe_ingredients
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS recipe_id UUID,
    ADD COLUMN IF NOT EXISTS ingredient_id UUID,
    ADD COLUMN IF NOT EXISTS raw_ingredient_name TEXT,
    ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'lb',
    ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prep_note TEXT,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  `;
}

async function getRecipeWithIngredients(
  recipeId: string,
  companyId: string,
): Promise<RecipeWithIngredients | null> {
  const recipeRows = await sql<RecipeRow[]>`
    SELECT
      id,
      company_id,
      name,
      category,
      servings,
      selling_price,
      total_food_cost,
      cost_per_serving,
      margin_percent,
      prep_time_minutes,
      cook_time_minutes,
      portion_weight,
      portion_unit,
      prep_photo_url,
      final_plate_photo_url,
      instructions,
      source_type,
      created_at,
      updated_at
    FROM recipes
    WHERE id::text = ${recipeId}
    AND company_id::text = ${companyId}
    LIMIT 1;
  `;

  const recipe = recipeRows[0];

  if (!recipe) {
    return null;
  }

  const ingredientRows = await sql<RecipeIngredientRow[]>`
    SELECT
      ri.id,
      ri.company_id,
      ri.recipe_id,
      ri.ingredient_id,
      ri.raw_ingredient_name,
      i.name AS ingredient_name,
      ri.quantity,
      ri.unit,
      ri.cost_per_unit,
      ri.line_cost,
      ri.prep_note,
      ri.sort_order
    FROM recipe_ingredients ri
    LEFT JOIN ingredients i
      ON i.id = ri.ingredient_id
      AND i.company_id::text = ${companyId}
    WHERE ri.recipe_id::text = ${recipeId}
    AND ri.company_id::text = ${companyId}
    ORDER BY ri.sort_order ASC, ri.created_at ASC NULLS LAST;
  `;

  return {
    ...recipe,
    ingredients: ingredientRows,
    recipe_ingredients: ingredientRows,
  };
}

async function findOrCreateIngredient(
  tx: postgres.TransactionSql,
  companyId: string,
  ingredientName: string,
  unit: string,
  costPerUnit: number,
): Promise<string> {
  const existingIngredients = await tx<{ id: string }[]>`
    SELECT id
    FROM ingredients
    WHERE company_id::text = ${companyId}
    AND LOWER(name) = LOWER(${ingredientName})
    LIMIT 1;
  `;

  const existingIngredient = existingIngredients[0];

  if (existingIngredient) {
    await tx`
      UPDATE ingredients
      SET
        unit = COALESCE(NULLIF(${unit}, ''), unit),
        latest_cost = CASE
          WHEN ${costPerUnit} > 0 THEN ${costPerUnit}
          ELSE latest_cost
        END,
        updated_at = NOW()
      WHERE id::text = ${existingIngredient.id}
      AND company_id::text = ${companyId};
    `;

    return existingIngredient.id;
  }

  const insertedIngredients = await tx<{ id: string }[]>`
    INSERT INTO ingredients (
      id,
      company_id,
      name,
      unit,
      latest_cost,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      ${companyId},
      ${ingredientName},
      ${unit || "lb"},
      ${costPerUnit},
      NOW(),
      NOW()
    )
    RETURNING id;
  `;

  const insertedIngredient = insertedIngredients[0];

  if (!insertedIngredient) {
    throw new Error("Ingredient insert failed.");
  }

  return insertedIngredient.id;
}

function normalizeIngredients(
  ingredients: RecipeIngredientInput[],
): {
  rawIngredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  lineCost: number;
  prepNote: string;
  sortOrder: number;
}[] {
  return ingredients
    .map((ingredient, index) => {
      const rawIngredientName = cleanText(
        ingredient.rawIngredientName ??
          ingredient.raw_ingredient_name ??
          ingredient.name,
      );
      const quantity = toNumber(ingredient.quantity);
      const costPerUnit = toNumber(
        ingredient.costPerUnit ?? ingredient.cost_per_unit,
      );
      const providedLineCost = toNumber(
        ingredient.lineCost ?? ingredient.line_cost,
      );
      const lineCost = providedLineCost > 0 ? providedLineCost : quantity * costPerUnit;

      return {
        rawIngredientName,
        quantity: quantity > 0 ? quantity : 1,
        unit: cleanText(ingredient.unit) || "lb",
        costPerUnit,
        lineCost,
        prepNote: cleanText(ingredient.prepNote ?? ingredient.prep_note),
        sortOrder:
          toNumber(ingredient.sortOrder ?? ingredient.sort_order) || index + 1,
      };
    })
    .filter((ingredient) => ingredient.rawIngredientName.length > 0);
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

  return "Recipe request failed.";
}

function getStatusCode(error: unknown): number {
  if (error instanceof Error && error.message === "Not authenticated") {
    return 401;
  }

  if (error instanceof Error && error.message === "Recipe not found.") {
    return 404;
  }

  return 500;
}