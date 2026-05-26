import { NextRequest, NextResponse } from "next/server";
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

type RouteContext = {
  params: Promise<{
    recipeId: string;
  }>;
};

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

type RecipeRow = {
  id: string;
  name: string | null;
};

type CountRow = {
  count: number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown recipe delete error";
}

async function requireCurrentUser(): Promise<CurrentUser> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.company_id) {
    throw new Error("Not authenticated");
  }

  return {
    id: String(currentUser.id),
    email: String(currentUser.email),
    role: String(currentUser.role),
    company_id: String(currentUser.company_id),
  };
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await requireCurrentUser();
    const { recipeId } = await context.params;
    const companyId = currentUser.company_id;

    if (!recipeId) {
      return NextResponse.json(
        { success: false, error: "Recipe ID is required." },
        { status: 400 },
      );
    }

    const recipeRows = await sql<RecipeRow[]>`
      SELECT id::text, name
      FROM recipes
      WHERE id::text = ${recipeId}
        AND company_id::text = ${companyId}
      LIMIT 1
    `;

    const recipe = recipeRows[0];

    if (!recipe) {
      return NextResponse.json(
        { success: false, error: "Recipe not found." },
        { status: 404 },
      );
    }

    const eventLineRows = await sql<CountRow[]>`
      SELECT COUNT(*)::int AS count
      FROM event_recipe_lines
      WHERE recipe_id::text = ${recipeId}
        AND company_id::text = ${companyId}
    `;

    const eventLineCount = eventLineRows[0]?.count ?? 0;

    if (eventLineCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This recipe is used in an event menu. Remove it from the event first, then delete the recipe.",
        },
        { status: 409 },
      );
    }

    await sql.begin(async (transaction) => {
      await transaction`
        DELETE FROM recipe_ingredients
        WHERE recipe_id::text = ${recipeId}
          AND company_id::text = ${companyId}
      `;

      await transaction`
        DELETE FROM recipes
        WHERE id::text = ${recipeId}
          AND company_id::text = ${companyId}
      `;
    });

    return NextResponse.json({
      success: true,
      deletedRecipeId: recipe.id,
      deletedRecipeName: recipe.name,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}