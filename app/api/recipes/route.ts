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

type CreateRecipeBody = {
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
  ingredient_count: string | number | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
};

type RecipeIngredientRow = {
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

type RecipeDetailRow = Omit<RecipeRow, "ingredient_count"> & {
  ingredients: RecipeIngredientRow[];
  recipe_ingredients: RecipeIngredientRow[];
};

type GetApiResponse =
  | {
      success: true;
      recipes: RecipeRow[];
      data: RecipeRow[];
      role: string;
      canCreateRecipe: boolean;
      canEditRecipe: boolean;
      canPrintRecipe: boolean;
    }
  | {
      success: false;
      recipes: [];
      data: [];
      error: string;
    };

type PostApiResponse =
  | {
      success: true;
      message: string;
      recipe: RecipeDetailRow;
      data: RecipeDetailRow;
    }
  | {
      success: false;
      error: string;
    };

 export async function GET(
  request: NextRequest,
): Promise<NextResponse<GetApiResponse>> {
  try {
    const currentUser = await getCurrentUser();
    const normalizedRole = String(currentUser.role ?? "").toUpperCase();
    await ensureRecipeColumns();

    const searchParams = request.nextUrl.searchParams;
    const search = cleanText(searchParams.get("search"));
    const category = cleanText(searchParams.get("category"));
    const marginFilter = cleanText(searchParams.get("margin"));

    const recipes = await getRecipes({
      companyId: currentUser.company_id,
      search,
      category,
      marginFilter,
    });

    return NextResponse.json({
      success: true,
      recipes,
      data: recipes,
      role: normalizedRole,
      canCreateRecipe: ["OWNER", "MANAGER", "CHEF"].includes(normalizedRole),
      canEditRecipe: ["OWNER", "MANAGER", "CHEF"].includes(normalizedRole), 
      canPrintRecipe: ["OWNER", "MANAGER", "CHEF", "KITCHEN_STAFF"].includes(normalizedRole),
    });
  } catch (error: unknown) {
    console.error("GET /api/recipes error:", error);

    return NextResponse.json(
      {
        success: false,
        recipes: [],
        data: [],
        error: getErrorMessage(error),
      },
      { status: getStatusCode(error) },
    );
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<PostApiResponse>> {
  try {
    const currentUser = await getCurrentUser();
    const normalizedRole = String(currentUser.role ?? "").toUpperCase();
    await ensureRecipeColumns();

    if (!canManageRecipes(currentUser.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only owner or manager can create recipes.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateRecipeBody;

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

    const result = await sql.begin(async (tx) => {
      const insertedRecipes = await tx<
        Omit<RecipeRow, "ingredient_count">[]
      >`
        INSERT INTO recipes (
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
        )
        VALUES (
          gen_random_uuid(),
          ${currentUser.company_id},
          ${recipeName},
          ${cleanText(body.category) || "Other"},
          ${servings},
          ${sellingPrice},
          ${totalFoodCost},
          ${costPerServing},
          ${marginPercent},
          ${toNumber(body.prepTimeMinutes ?? body.prep_time_minutes)},
          ${toNumber(body.cookTimeMinutes ?? body.cook_time_minutes)},
          ${toNumber(body.portionWeight ?? body.portion_weight)},
          ${cleanText(body.portionUnit ?? body.portion_unit) || "oz"},
          ${cleanText(body.prepPhotoUrl ?? body.prep_photo_url)},
          ${cleanText(body.finalPlatePhotoUrl ?? body.final_plate_photo_url)},
          ${cleanText(body.instructions)},
          ${cleanText(body.sourceType ?? body.source_type) || "manual"},
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

      const insertedIngredients: RecipeIngredientRow[] = [];

      for (const ingredient of cleanIngredients) {
        const matchedIngredientId = await findOrCreateIngredient(
          tx,
          currentUser.company_id,
          ingredient.rawIngredientName,
          ingredient.unit,
          ingredient.costPerUnit,
        );

        const insertedIngredientRows = await tx<RecipeIngredientRow[]>`
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
            ${insertedRecipe.id},
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

        const insertedIngredient = insertedIngredientRows[0];

        if (insertedIngredient) {
          insertedIngredients.push(insertedIngredient);
        }
      }

      return {
        ...insertedRecipe,
        ingredients: insertedIngredients,
        recipe_ingredients: insertedIngredients,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Recipe created.",
      recipe: result,
      data: result,
    });
  } catch (error: unknown) {
    console.error("POST /api/recipes error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getStatusCode(error) },
    );
  }
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
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;
}

async function getRecipes(input: {
  companyId: string;
  search: string;
  category: string;
  marginFilter: string;
}): Promise<RecipeRow[]> {
  const searchPattern = `%${input.search}%`;
  const categoryPattern = `%${input.category}%`;

  if (input.search && input.category && input.marginFilter === "low") {
    return sql<RecipeRow[]>`
      SELECT
        r.id,
        r.company_id,
        r.name,
        r.category,
        r.servings,
        r.selling_price,
        r.total_food_cost,
        r.cost_per_serving,
        r.margin_percent,
        r.prep_time_minutes,
        r.cook_time_minutes,
        r.portion_weight,
        r.portion_unit,
        r.prep_photo_url,
        r.final_plate_photo_url,
        r.instructions,
        r.source_type,
        COUNT(ri.id) AS ingredient_count,
        r.created_at,
        r.updated_at
      FROM recipes r
      LEFT JOIN recipe_ingredients ri
        ON ri.recipe_id = r.id
        AND ri.company_id = r.company_id
      WHERE r.company_id::text = ${input.companyId}
      AND r.name ILIKE ${searchPattern}
      AND r.category ILIKE ${categoryPattern}
      AND COALESCE(r.margin_percent, 0) < 30
      GROUP BY r.id
      ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC NULLS LAST;
    `;
  }

  if (input.search && input.category) {
    return sql<RecipeRow[]>`
      SELECT
        r.id,
        r.company_id,
        r.name,
        r.category,
        r.servings,
        r.selling_price,
        r.total_food_cost,
        r.cost_per_serving,
        r.margin_percent,
        r.prep_time_minutes,
        r.cook_time_minutes,
        r.portion_weight,
        r.portion_unit,
        r.prep_photo_url,
        r.final_plate_photo_url,
        r.instructions,
        r.source_type,
        COUNT(ri.id) AS ingredient_count,
        r.created_at,
        r.updated_at
      FROM recipes r
      LEFT JOIN recipe_ingredients ri
        ON ri.recipe_id = r.id
        AND ri.company_id = r.company_id
      WHERE r.company_id::text = ${input.companyId}
      AND r.name ILIKE ${searchPattern}
      AND r.category ILIKE ${categoryPattern}
      GROUP BY r.id
      ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC NULLS LAST;
    `;
  }

  if (input.search) {
    return sql<RecipeRow[]>`
      SELECT
        r.id,
        r.company_id,
        r.name,
        r.category,
        r.servings,
        r.selling_price,
        r.total_food_cost,
        r.cost_per_serving,
        r.margin_percent,
        r.prep_time_minutes,
        r.cook_time_minutes,
        r.portion_weight,
        r.portion_unit,
        r.prep_photo_url,
        r.final_plate_photo_url,
        r.instructions,
        r.source_type,
        COUNT(ri.id) AS ingredient_count,
        r.created_at,
        r.updated_at
      FROM recipes r
      LEFT JOIN recipe_ingredients ri
        ON ri.recipe_id = r.id
        AND ri.company_id = r.company_id
      WHERE r.company_id::text = ${input.companyId}
      AND r.name ILIKE ${searchPattern}
      GROUP BY r.id
      ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC NULLS LAST;
    `;
  }

  if (input.category) {
    return sql<RecipeRow[]>`
      SELECT
        r.id,
        r.company_id,
        r.name,
        r.category,
        r.servings,
        r.selling_price,
        r.total_food_cost,
        r.cost_per_serving,
        r.margin_percent,
        r.prep_time_minutes,
        r.cook_time_minutes,
        r.portion_weight,
        r.portion_unit,
        r.prep_photo_url,
        r.final_plate_photo_url,
        r.instructions,
        r.source_type,
        COUNT(ri.id) AS ingredient_count,
        r.created_at,
        r.updated_at
      FROM recipes r
      LEFT JOIN recipe_ingredients ri
        ON ri.recipe_id = r.id
        AND ri.company_id = r.company_id
      WHERE r.company_id::text = ${input.companyId}
      AND r.category ILIKE ${categoryPattern}
      GROUP BY r.id
      ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC NULLS LAST;
    `;
  }

  if (input.marginFilter === "low") {
    return sql<RecipeRow[]>`
      SELECT
        r.id,
        r.company_id,
        r.name,
        r.category,
        r.servings,
        r.selling_price,
        r.total_food_cost,
        r.cost_per_serving,
        r.margin_percent,
        r.prep_time_minutes,
        r.cook_time_minutes,
        r.portion_weight,
        r.portion_unit,
        r.prep_photo_url,
        r.final_plate_photo_url,
        r.instructions,
        r.source_type,
        COUNT(ri.id) AS ingredient_count,
        r.created_at,
        r.updated_at
      FROM recipes r
      LEFT JOIN recipe_ingredients ri
        ON ri.recipe_id = r.id
        AND ri.company_id = r.company_id
      WHERE r.company_id::text = ${input.companyId}
      AND COALESCE(r.margin_percent, 0) < 30
      GROUP BY r.id
      ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC NULLS LAST;
    `;
  }

  return sql<RecipeRow[]>`
    SELECT
      r.id,
      r.company_id,
      r.name,
      r.category,
      r.servings,
      r.selling_price,
      r.total_food_cost,
      r.cost_per_serving,
      r.margin_percent,
      r.prep_time_minutes,
      r.cook_time_minutes,
      r.portion_weight,
      r.portion_unit,
      r.prep_photo_url,
      r.final_plate_photo_url,
      r.instructions,
      r.source_type,
      COUNT(ri.id) AS ingredient_count,
      r.created_at,
      r.updated_at
    FROM recipes r
    LEFT JOIN recipe_ingredients ri
      ON ri.recipe_id = r.id
      AND ri.company_id = r.company_id
    WHERE r.company_id::text = ${input.companyId}
    GROUP BY r.id
    ORDER BY r.updated_at DESC NULLS LAST, r.created_at DESC NULLS LAST;
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

function canManageRecipes(role: string): boolean {
  return role === "OWNER" || role === "MANAGER";
}

function canViewRecipes(role: string): boolean {
  return (
    role === "OWNER" ||
    role === "MANAGER" ||
    role === "CHEF" ||
    role === "KITCHEN_STAFF"
  );
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

  return 500;
}