import { NextRequest, NextResponse } from "next/server";
import { Pool, PoolClient } from "pg";
import { getSessionFromRequest } from "../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ColumnRow = {
  column_name: string;
};

type RecipeRow = {
  id: string;
};

type DeleteResponse =
  | {
      success: true;
      deletedRecipes: number;
      deletedRecipeIngredients: number;
    }
  | {
      success: false;
      error: string;
    };

const databaseUrl = process.env.DATABASE_URL ?? "";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.length > 0 && !databaseUrl.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
});

export async function GET(request: NextRequest): Promise<NextResponse<DeleteResponse>> {
  return deleteOldRecipe(request);
}

export async function POST(request: NextRequest): Promise<NextResponse<DeleteResponse>> {
  return deleteOldRecipe(request);
}

async function deleteOldRecipe(request: NextRequest): Promise<NextResponse<DeleteResponse>> {
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

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const recipeColumns = await getColumns(client, "recipes");
    const hasName = recipeColumns.has("name");
    const hasRecipeName = recipeColumns.has("recipe_name");

    if (!hasName && !hasRecipeName) {
      throw new Error("recipes table has no name or recipe_name column.");
    }

    const nameFilters: string[] = [];

    if (hasName) {
      nameFilters.push("LOWER(TRIM(name)) = LOWER(TRIM($2))");
    }

    if (hasRecipeName) {
      nameFilters.push("LOWER(TRIM(recipe_name)) = LOWER(TRIM($2))");
    }

    const recipeResult = await client.query<RecipeRow>(
      `
        SELECT id
        FROM recipes
        WHERE company_id = $1
          AND (${nameFilters.join(" OR ")})
      `,
      [session.company_id, "Mix Veg Manchurian Ball"],
    );

    const recipeIds = recipeResult.rows.map((recipe) => recipe.id);

    if (recipeIds.length === 0) {
      await client.query("ROLLBACK");

      return NextResponse.json({
        success: false,
        error: "No Mix Veg Manchurian Ball recipe found for this company.",
      });
    }

    const deletedRecipeIngredients = await client.query(
      `
        DELETE FROM recipe_ingredients
        WHERE company_id = $1
          AND recipe_id = ANY($2::uuid[])
      `,
      [session.company_id, recipeIds],
    );

    const deletedRecipes = await client.query(
      `
        DELETE FROM recipes
        WHERE company_id = $1
          AND id = ANY($2::uuid[])
      `,
      [session.company_id, recipeIds],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      deletedRecipes: deletedRecipes.rowCount ?? 0,
      deletedRecipeIngredients: deletedRecipeIngredients.rowCount ?? 0,
    });
  } catch (error: unknown) {
    await client?.query("ROLLBACK").catch(() => undefined);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete old recipe.",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

async function getColumns(client: PoolClient, tableName: string): Promise<Set<string>> {
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