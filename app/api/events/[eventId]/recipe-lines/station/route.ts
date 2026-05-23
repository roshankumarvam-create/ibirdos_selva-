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

type KitchenStation =
  | "Unassigned"
  | "Hot Station"
  | "Cold Station"
  | "Packing"
  | "Delivery";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type StationBody = {
  lineId?: string;
  station?: string;
};

type EventRecipeLineRow = {
  id: string;
  event_id: string;
  recipe_id: string | null;
  station: string | null;
  updated_at: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown station update error";
}

function isKitchenStation(value: string): value is KitchenStation {
  return [
    "Unassigned",
    "Prep",
    "Hot Kitchen",
    "Cold Kitchen",
    "Hot Station",
    "Cold Station",
    "grill",
    "oven",
    "Tandoor",
    "Saute",
    "Bakery",
    "Fry",
    "Packing",
    "packaging",
    "Delivery",
  ].includes(value);
}

async function ensureStationColumn(): Promise<void> {
  await sql`
    ALTER TABLE event_recipe_lines
    ADD COLUMN IF NOT EXISTS station TEXT DEFAULT 'Unassigned',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();

    await ensureStationColumn();

    const { eventId } = await context.params;
    const body = (await request.json()) as StationBody;

    const lineId = body.lineId?.trim() ?? "";
    const station = body.station?.trim() ?? "";

    if (!lineId) {
      return NextResponse.json(
        {
          success: false,
          error: "lineId is required",
        },
        { status: 400 },
      );
    }

    if (!isKitchenStation(station)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid station",
          allowedStations: [
            "Unassigned",
            "Prep",
            "Hot Kitchen",
            "Cold Kitchen",
            "Hot Station",
            "Cold Station",
            "grill",
            "oven",
            "Tandoor",
            "Saute",
            "Bakery",
            "Fry",
            "Packing",
            "packaging",
            "Delivery",
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
      SET station = ${station},
          updated_at = NOW()
      WHERE id::text = ${lineId}
      AND event_id::text = ${eventId}
      AND company_id::text = ${currentUser.company_id}
      RETURNING id, event_id, recipe_id, station, updated_at;
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
        station: line.station,
        updatedAt: line.updated_at,
      },
    });
  } catch (error: unknown) {
    console.error("PATCH recipe line station error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}