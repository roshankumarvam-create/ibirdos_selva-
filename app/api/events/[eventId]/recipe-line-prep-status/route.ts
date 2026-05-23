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

type PrepStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type PrepStatusBody = {
  lineId?: string;
  prepStatus?: string;
};

type EventRecipeLineRow = {
  id: string;
  event_id: string;
  recipe_id: string | null;
  prep_status: string | null;
  updated_at: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown prep status error";
}

function isPrepStatus(value: string): value is PrepStatus {
  return ["Not Started", "In Progress", "Completed", "Blocked"].includes(value);
}

async function ensurePrepStatusColumn(): Promise<void> {
  await sql`
    ALTER TABLE event_recipe_lines
    ADD COLUMN IF NOT EXISTS prep_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();
    await ensurePrepStatusColumn();

    const { eventId } = await context.params;
    const body = (await request.json()) as PrepStatusBody;

    const lineId = body.lineId?.trim() ?? "";
    const prepStatus = body.prepStatus?.trim() ?? "";

    if (!lineId) {
      return NextResponse.json(
        {
          success: false,
          error: "lineId is required",
        },
        { status: 400 },
      );
    }

    if (!isPrepStatus(prepStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid prepStatus",
          allowedStatuses: [
            "Not Started",
            "In Progress",
            "Completed",
            "Blocked",
          ],
        },
        { status: 400 },
      );
    }

    const eventRows = await sql`
      SELECT id
      FROM events
      WHERE id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      LIMIT 1;
    `;

    if (eventRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const updatedRows = await sql`
      UPDATE event_recipe_lines
      SET
        prep_status = ${prepStatus},
        updated_at = NOW()
      WHERE id::text = ${lineId}
        AND event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      RETURNING
        id,
        event_id,
        recipe_id,
        prep_status,
        updated_at;
    `;

    if (updatedRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Event recipe line not found",
        },
        { status: 404 },
      );
    }

    const line = updatedRows[0] as unknown as EventRecipeLineRow;

    return NextResponse.json({
      success: true,
      eventId,
      line: {
        id: line.id,
        eventId: line.event_id,
        recipeId: line.recipe_id,
        prepStatus: line.prep_status,
        updatedAt: line.updated_at,
      },
    });
  } catch (error: unknown) {
    console.error("PATCH recipe line prep status error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}