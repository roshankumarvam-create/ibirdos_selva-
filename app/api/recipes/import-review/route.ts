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

type RecipeIngredientInput = {
  ingredientId?: string | null;
  rawIngredientName?: string;
  name?: string;
  quantity?: number | string;
  unit?: string;
  costPerUnit?: number | string;
  lineCost?: number | string;
  prepNote?: string;
  sortOrder?: number | string;
};

type ImportReviewBody = {
  recipeId?: string | null;
  recipeName?: string;
  name?: string;
  category?: string;
  servings?: number | string;
  sellingPrice?: number | string;
  prepTimeMinutes?: number | string;
  cookTimeMinutes?: number | string;
  portionWeight?: number | string;
  portionUnit?: string;
  prepPhotoUrl?: string;
  finalPlatePhotoUrl?: string;
  instructions?: string;
  sourceType?: string;
  ingredients?: RecipeIngredientInput[];
};

type SavedRecipeRow = {
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
  created_at: string;
  updated_at: string;
};

type SavedRecipeIngredientRow = {
  id: string;
  company_id: string;
  recipe_id: string;
  ingredient_id: string | null;
  raw_ingredient_name: string | null;
  quantity: string | number | null;
  unit: string | null;
  cost_per_unit: string | number | null;
  line_cost: string | number | null;
  prep_note: string | null;
  sort_order: string | number | null;
};

type ApiResponse =
  | {
      success: true;
      message: string;
      recipe: SavedRecipeRow & {
        ingredients: SavedRecipeIngredientRow[];
      };
      data: SavedRecipeRow & {
        ingredients: SavedRecipeIngredientRow[];
      };
    }
  | {
      success: false;
      error: string;
    };

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: "Recipe import review API is working.",
  });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse>> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureRecipeColumns();

    const body = (await request.json()) as ImportReviewBody;

    const recipeName = cleanText(body.recipeName ?? body.name);

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
    const sellingPrice = toNumber(body.sellingPrice);
    const totalFoodCost = cleanIngredients.reduce((sum, ingredient) => {
      return sum + ingredient.lineCost;
    }, 0);
    const costPerServing = totalFoodCost / servings;
    const profitPerServing = sellingPrice - costPerServing;
    const marginPercent =
      sellingPrice > 0 ? (profitPerServing / sellingPrice) * 100 : 0;

    const result = await sql.begin(async (tx) => {
      let savedRecipe: SavedRecipeRow;

      if (body.recipeId && isUuid(body.recipeId)) {
        const updatedRecipes = await tx<SavedRecipeRow[]>`
          UPDATE recipes
          SET
            name = ${recipeName},
            category = ${cleanText(body.category) || "Other"},
            servings = ${servings},
            selling_price = ${sellingPrice},
            total_food_cost = ${totalFoodCost},
            cost_per_serving = ${costPerServing},
            margin_percent = ${marginPercent},
            prep_time_minutes = ${toNumber(body.prepTimeMinutes)},
            cook_time_minutes = ${toNumber(body.cookTimeMinutes)},
            portion_weight = ${toNumber(body.portionWeight)},
            portion_unit = ${cleanText(body.portionUnit) || "oz"},
            prep_photo_url = ${cleanText(body.prepPhotoUrl)},
            final_plate_photo_url = ${cleanText(body.finalPlatePhotoUrl)},
            instructions = ${cleanText(body.instructions)},
            source_type = ${cleanText(body.sourceType) || "import"},
            updated_at = NOW()
          WHERE id::text = ${body.recipeId}
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

        savedRecipe = updatedRecipe;
      } else {
        const existingRecipes = await tx<SavedRecipeRow[]>`
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
          WHERE company_id::text = ${currentUser.company_id}
          AND LOWER(name) = LOWER(${recipeName})
          LIMIT 1;
        `;

        const existingRecipe = existingRecipes[0];

        if (existingRecipe) {
          const updatedRecipes = await tx<SavedRecipeRow[]>`
            UPDATE recipes
            SET
              category = ${cleanText(body.category) || "Other"},
              servings = ${servings},
              selling_price = ${sellingPrice},
              total_food_cost = ${totalFoodCost},
              cost_per_serving = ${costPerServing},
              margin_percent = ${marginPercent},
              prep_time_minutes = ${toNumber(body.prepTimeMinutes)},
              cook_time_minutes = ${toNumber(body.cookTimeMinutes)},
              portion_weight = ${toNumber(body.portionWeight)},
              portion_unit = ${cleanText(body.portionUnit) || "oz"},
              prep_photo_url = ${cleanText(body.prepPhotoUrl)},
              final_plate_photo_url = ${cleanText(body.finalPlatePhotoUrl)},
              instructions = ${cleanText(body.instructions)},
              source_type = ${cleanText(body.sourceType) || "import"},
              updated_at = NOW()
            WHERE id::text = ${existingRecipe.id}
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
            throw new Error("Recipe update failed.");
          }

          savedRecipe = updatedRecipe;
        } else {
          const insertedRecipes = await tx<SavedRecipeRow[]>`
            INSERT INTO recipes (
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
            )
            VALUES (
              ${currentUser.company_id},
              ${recipeName},
              ${cleanText(body.category) || "Other"},
              ${servings},
              ${sellingPrice},
              ${totalFoodCost},
              ${costPerServing},
              ${marginPercent},
              ${toNumber(body.prepTimeMinutes)},
              ${toNumber(body.cookTimeMinutes)},
              ${toNumber(body.portionWeight)},
              ${cleanText(body.portionUnit) || "oz"},
              ${cleanText(body.prepPhotoUrl)},
              ${cleanText(body.finalPlatePhotoUrl)},
              ${cleanText(body.instructions)},
              ${cleanText(body.sourceType) || "import"},
              NOW(),
              NOW()
            )
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

          const insertedRecipe = insertedRecipes[0];

          if (!insertedRecipe) {
            throw new Error("Recipe insert failed.");
          }

          savedRecipe = insertedRecipe;
        }
      }

      await tx`
        DELETE FROM recipe_ingredients
        WHERE recipe_id::text = ${savedRecipe.id}
        AND company_id::text = ${currentUser.company_id};
      `;

      const insertedIngredients: SavedRecipeIngredientRow[] = [];

      for (const ingredient of cleanIngredients) {
        const matchedIngredientId = await findOrCreateIngredient(
          tx,
          currentUser.company_id,
          ingredient.rawIngredientName,
          ingredient.unit,
          ingredient.costPerUnit,
        );

        const insertedRows = await tx<SavedRecipeIngredientRow[]>`
          INSERT INTO recipe_ingredients (
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
            ${currentUser.company_id},
            ${savedRecipe.id},
            ${matchedIngredientId},
            ${ingredient.rawIngredientName},
            ${ingredient.quantity},
            ${ingredient.unit},
            ${ingredient.costPerUnit},
            ${ingredient.lineCost},
            ${ingredient.prepNote},
            ${ingredient.sortOrder}
          )
          RETURNING
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
            sort_order;
        `;

        const insertedIngredient = insertedRows[0];

        if (insertedIngredient) {
          insertedIngredients.push(insertedIngredient);
        }
      }

      return {
        ...savedRecipe,
        ingredients: insertedIngredients,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Recipe saved from import review.",
      recipe: result,
      data: result,
    });
  } catch (error: unknown) {
    console.error("POST /api/recipes/import-review error:", error);

    const status =
      error instanceof Error && error.message === "Not authenticated"
        ? 401
        : 500;

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Recipe import review save failed.",
      },
      { status },
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
        ingredient.rawIngredientName ?? ingredient.name,
      );
      const quantity = toNumber(ingredient.quantity);
      const costPerUnit = toNumber(ingredient.costPerUnit);
      const lineCost =
        toNumber(ingredient.lineCost) > 0
          ? toNumber(ingredient.lineCost)
          : quantity * costPerUnit;

      return {
        rawIngredientName,
        quantity: quantity > 0 ? quantity : 1,
        unit: cleanText(ingredient.unit) || "lb",
        costPerUnit,
        lineCost,
        prepNote: cleanText(ingredient.prepNote),
        sortOrder: toNumber(ingredient.sortOrder) || index + 1,
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