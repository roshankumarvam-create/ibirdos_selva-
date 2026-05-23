import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type RouteContext = {
  params: { eventId: string } | Promise<{ eventId: string }>;
};

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown reset event recipe lines error";
}

async function getEventId(context: RouteContext): Promise<string> {
  const params = await context.params;
  return params.eventId;
}

async function getCurrentUser(): Promise<CurrentUser> {
  const users = await sql`
    SELECT id, email, role, company_id
    FROM users
    WHERE email = 'owner@ibirdos.com'
    LIMIT 1;
  `;

  const user = users[0] as CurrentUser | undefined;

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.company_id) {
    throw new Error("User missing company_id");
  }

  return user;
}

async function ensureEventAccess(eventId: string, companyId: string): Promise<void> {
  const events = await sql`
    SELECT id
    FROM events
    WHERE id::text = ${eventId}
    AND company_id::text = ${companyId}
    LIMIT 1;
  `;

  if (events.length === 0) {
    throw new Error("Event not found");
  }
}

async function resetEventRecipeLines(request: NextRequest, context: RouteContext) {
  try {
    const confirm = request.nextUrl.searchParams.get("confirm");

    if (confirm !== "RESET") {
      return NextResponse.json(
        {
          success: false,
          error: "Add ?confirm=RESET to reset this event menu.",
        },
        { status: 400 },
      );
    }

    const currentUser = await getCurrentUser();
    const eventId = await getEventId(context);

    await ensureEventAccess(eventId, currentUser.company_id);

    const deletedRows = await sql`
      DELETE FROM event_recipe_lines
      WHERE event_id::text = ${eventId}
      AND company_id::text = ${currentUser.company_id}
      RETURNING id;
    `;

    await sql`
      UPDATE events
      SET
        revenue = 0,
        food_cost = 0,
        total_cost = 0,
        margin = 0
      WHERE id::text = ${eventId}
      AND company_id::text = ${currentUser.company_id};
    `;

    return NextResponse.json({
      success: true,
      eventId,
      deletedCount: deletedRows.length,
      message: "Event recipe lines reset.",
    });
  } catch (error: unknown) {
    console.error("RESET /api/events/[eventId]/recipe-lines/reset error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return resetEventRecipeLines(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return resetEventRecipeLines(request, context);
}