import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "@/app/lib/server-auth";

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

type SessionUser = {
  user_id?: string;
  email?: string;
  role?: string;
  company_id?: string;
};

type EventProfitRow = {
  event_id: string;
  event_name: string | null;
  name: string | null;
  event_date: string | null;
  status: string | null;
  revenue: string | number | null;
  food_cost: string | number | null;
  margin: string | number | null;
  menu_items: string | number | null;
  open_prep_items: string | number | null;
};

type DashboardEventProfit = {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  status: string;
  revenue: number;
  foodCost: number;
  margin: number;
  menuItems: number;
  openPrepItems: number;
};

class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown dashboard event profit error";
}

function getResponseStatus(error: unknown): number {
  return error instanceof UnauthorizedError ? 401 : 500;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

function roundPercent(value: number): number {
  return Number(value.toFixed(2));
}

async function getSafeCurrentUser(
  request: NextRequest,
): Promise<CurrentUser> {
  const session = (await getSessionFromRequest(request)) as SessionUser | null;

  if (
    !session ||
    typeof session.user_id !== "string" ||
    typeof session.email !== "string" ||
    typeof session.role !== "string" ||
    typeof session.company_id !== "string" ||
    session.company_id.trim().length === 0
  ) {
    throw new UnauthorizedError();
  }

  return {
    id: session.user_id,
    email: session.email,
    role: session.role,
    company_id: session.company_id,
  };
}

async function ensureDashboardColumns(): Promise<void> {
  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS event_name TEXT,
    ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS food_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE event_recipe_lines
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS customer_portions NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prep_portions NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prep_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_events_company_id
    ON events(company_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_event_recipe_lines_company_event
    ON event_recipe_lines(company_id, event_id);
  `;
}

function normalizeEventProfit(row: EventProfitRow): DashboardEventProfit {
  const revenue = roundMoney(toNumber(row.revenue, 0));
  const foodCost = roundMoney(toNumber(row.food_cost, 0));
  const margin =
    revenue > 0 ? roundPercent(((revenue - foodCost) / revenue) * 100) : 0;

  return {
    eventId: row.event_id,
    eventName: row.event_name || row.name || "Untitled Event",
    eventDate: row.event_date,
    status: row.status || "Active",
    revenue,
    foodCost,
    margin,
    menuItems: toNumber(row.menu_items, 0),
    openPrepItems: toNumber(row.open_prep_items, 0),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await getSafeCurrentUser(request);

    await ensureDashboardColumns();

    const rows = (await sql`
      WITH event_line_totals AS (
        SELECT
          event_id,
          company_id,
          COALESCE(SUM(COALESCE(selling_price, 0)::numeric * COALESCE(customer_portions, 0)::numeric), 0) AS revenue,
          COALESCE(SUM(COALESCE(total_cost, 0)::numeric), 0) AS food_cost,
          COUNT(*) AS menu_items,
          COUNT(*) FILTER (
            WHERE LOWER(COALESCE(prep_status, 'not started')) NOT IN (
              'done',
              'complete',
              'completed',
              'packed',
              'finished'
            )
          ) AS open_prep_items
        FROM event_recipe_lines
        WHERE company_id::text = ${currentUser.company_id}
        GROUP BY event_id, company_id
      )
      SELECT
        e.id::text AS event_id,
        e.event_name,
        e.name,
        e.event_date::text AS event_date,
        e.status::text AS status,
        COALESCE(elt.revenue, e.revenue, 0) AS revenue,
        COALESCE(elt.food_cost, e.food_cost, 0) AS food_cost,
        CASE
          WHEN COALESCE(elt.revenue, e.revenue, 0) > 0 THEN
            (
              (
                COALESCE(elt.revenue, e.revenue, 0)
                - COALESCE(elt.food_cost, e.food_cost, 0)
              )
              / COALESCE(elt.revenue, e.revenue, 0)
            ) * 100
          ELSE 0
        END AS margin,
        COALESCE(elt.menu_items, 0) AS menu_items,
        COALESCE(elt.open_prep_items, 0) AS open_prep_items
      FROM events e
      LEFT JOIN event_line_totals elt
        ON elt.event_id = e.id
        AND elt.company_id = e.company_id
      WHERE e.company_id::text = ${currentUser.company_id}
      ORDER BY e.updated_at DESC NULLS LAST, e.event_date DESC NULLS LAST, e.created_at DESC NULLS LAST;
    `) as unknown as EventProfitRow[];

    const events = rows.map(normalizeEventProfit);

    const totalRevenue = roundMoney(
      events.reduce((total, event) => total + event.revenue, 0),
    );

    const totalFoodCost = roundMoney(
      events.reduce((total, event) => total + event.foodCost, 0),
    );

    const profitableEvents = events.filter((event) => event.revenue > 0);

    const averageMargin =
      profitableEvents.length > 0
        ? roundPercent(
            profitableEvents.reduce((total, event) => total + event.margin, 0) /
              profitableEvents.length,
          )
        : 0;

    const lowMarginEvents = profitableEvents.filter(
      (event) => event.margin > 0 && event.margin < 35,
    ).length;

    const eventsNeedingPrep = events.filter(
      (event) => event.menuItems > 0 && event.openPrepItems > 0,
    ).length;

    const eventsReadyForKitchenPacket = events.filter(
      (event) => event.menuItems > 0,
    ).length;

    return NextResponse.json({
      success: true,
      totalRevenue,
      totalFoodCost,
      averageMargin,
      lowMarginEvents,
      eventsNeedingPrep,
      eventsReadyForKitchenPacket,
      eventCount: events.length,
      latestEvents: events.slice(0, 5),
    });
  } catch (error: unknown) {
    console.error("GET /api/dashboard/event-profit error:", error);

    return NextResponse.json(
      {
        success: false,
        totalRevenue: 0,
        totalFoodCost: 0,
        averageMargin: 0,
        lowMarginEvents: 0,
        eventsNeedingPrep: 0,
        eventsReadyForKitchenPacket: 0,
        eventCount: 0,
        latestEvents: [],
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}