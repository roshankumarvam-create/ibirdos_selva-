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

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

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

type ProfitSnapshotBody = {
  laborCost?: number | string;
  labor_cost?: number | string;
  packagingCost?: number | string;
  packaging_cost?: number | string;
  deliveryCost?: number | string;
  delivery_cost?: number | string;
  otherCost?: number | string;
  other_cost?: number | string;
  guestCount?: number | string;
  guest_count?: number | string;
  snapshotType?: string;
  snapshot_type?: string;
  notes?: string | null;
};

type EventRow = {
  id: string;
  company_id: string | null;
};

type ProfitMetricRow = {
  revenue: string | number | null;
  food_cost: string | number | null;
  menu_items_count: string | number | null;
  guest_count: string | number | null;
};

type ProfitSnapshotRow = {
  id: string;
  company_id: string;
  event_id: string;
  revenue: string | number;
  food_cost: string | number;
  labor_cost: string | number;
  packaging_cost: string | number;
  delivery_cost: string | number;
  other_cost: string | number;
  total_cost: string | number;
  gross_profit: string | number;
  margin_percent: string | number;
  menu_items_count: string | number;
  guest_count: string | number;
  snapshot_type: string;
  notes: string | null;
  created_at: string;
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

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown profit snapshot error";
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

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function cleanText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

function cleanNullableText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  return cleanValue.length > 0 ? cleanValue : null;
}

async function readJsonBody<TBody>(request: NextRequest): Promise<TBody> {
  try {
    return (await request.json()) as TBody;
  } catch {
    return {} as TBody;
  }
}

async function getSafeCurrentUser(request: NextRequest): Promise<CurrentUser> {
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

async function ensureProfitSnapshotTable(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_pnl_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID NOT NULL,
      revenue NUMERIC NOT NULL DEFAULT 0,
      food_cost NUMERIC NOT NULL DEFAULT 0,
      labor_cost NUMERIC NOT NULL DEFAULT 0,
      packaging_cost NUMERIC NOT NULL DEFAULT 0,
      delivery_cost NUMERIC NOT NULL DEFAULT 0,
      other_cost NUMERIC NOT NULL DEFAULT 0,
      total_cost NUMERIC NOT NULL DEFAULT 0,
      gross_profit NUMERIC NOT NULL DEFAULT 0,
      margin_percent NUMERIC NOT NULL DEFAULT 0,
      menu_items_count INTEGER NOT NULL DEFAULT 0,
      guest_count INTEGER NOT NULL DEFAULT 0,
      snapshot_type TEXT NOT NULL DEFAULT 'event_page',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE event_pnl_snapshots
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS revenue NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS food_cost NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS labor_cost NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivery_cost NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS other_cost NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gross_profit NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin_percent NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS menu_items_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS snapshot_type TEXT NOT NULL DEFAULT 'event_page',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS event_pnl_snapshots_company_event_idx
    ON event_pnl_snapshots(company_id, event_id);
  `;
}

async function ensureEventAccess(
  eventId: string,
  companyId: string,
): Promise<boolean> {
  const eventRows = (await sql`
    SELECT id, company_id
    FROM events
    WHERE id::text = ${eventId}
      AND company_id::text = ${companyId}
    LIMIT 1;
  `) as unknown as EventRow[];

  return eventRows.length > 0;
}

async function getProfitMetrics(
  eventId: string,
  companyId: string,
): Promise<{
  revenue: number;
  foodCost: number;
  menuItemsCount: number;
  guestCount: number;
}> {
  const rows = await sql`
    SELECT
      COALESCE(
        SUM(
          COALESCE(customer_portions, 0)::numeric *
          COALESCE(selling_price, 0)::numeric
        ),
        0
      )::numeric AS revenue,
      COALESCE(SUM(COALESCE(total_cost, 0)::numeric), 0)::numeric AS food_cost,
      COUNT(id)::integer AS menu_items_count,
      COALESCE(MAX(COALESCE(customer_portions, 0)::numeric), 0)::numeric AS guest_count
    FROM event_recipe_lines
    WHERE event_id::text = ${eventId}
      AND company_id::text = ${companyId};
  `;

  const row = rows[0] as unknown as ProfitMetricRow | undefined;

  return {
    revenue: toNumber(row?.revenue, 0),
    foodCost: toNumber(row?.food_cost, 0),
    menuItemsCount: Math.round(toNumber(row?.menu_items_count, 0)),
    guestCount: Math.round(toNumber(row?.guest_count, 0)),
  };
}

function mapSnapshot(row: ProfitSnapshotRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    company_id: row.company_id,
    eventId: row.event_id,
    event_id: row.event_id,
    revenue: toNumber(row.revenue, 0),
    foodCost: toNumber(row.food_cost, 0),
    food_cost: toNumber(row.food_cost, 0),
    laborCost: toNumber(row.labor_cost, 0),
    labor_cost: toNumber(row.labor_cost, 0),
    packagingCost: toNumber(row.packaging_cost, 0),
    packaging_cost: toNumber(row.packaging_cost, 0),
    deliveryCost: toNumber(row.delivery_cost, 0),
    delivery_cost: toNumber(row.delivery_cost, 0),
    otherCost: toNumber(row.other_cost, 0),
    other_cost: toNumber(row.other_cost, 0),
    totalCost: toNumber(row.total_cost, 0),
    total_cost: toNumber(row.total_cost, 0),
    grossProfit: toNumber(row.gross_profit, 0),
    gross_profit: toNumber(row.gross_profit, 0),
    marginPercent: toNumber(row.margin_percent, 0),
    margin_percent: toNumber(row.margin_percent, 0),
    menuItemsCount: toNumber(row.menu_items_count, 0),
    menu_items_count: toNumber(row.menu_items_count, 0),
    guestCount: toNumber(row.guest_count, 0),
    guest_count: toNumber(row.guest_count, 0),
    snapshotType: row.snapshot_type,
    snapshot_type: row.snapshot_type,
    notes: row.notes,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getSafeCurrentUser(request);
    const { eventId } = await context.params;

    await ensureProfitSnapshotTable();

    const hasAccess = await ensureEventAccess(eventId, currentUser.company_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          eventId,
          snapshots: [],
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const snapshotRows = (await sql`
      SELECT
        id,
        company_id,
        event_id,
        revenue,
        food_cost,
        labor_cost,
        packaging_cost,
        delivery_cost,
        other_cost,
        total_cost,
        gross_profit,
        margin_percent,
        menu_items_count,
        guest_count,
        snapshot_type,
        notes,
        created_at
      FROM event_pnl_snapshots
      WHERE company_id::text = ${currentUser.company_id}
        AND event_id::text = ${eventId}
      ORDER BY created_at DESC;
    `) as unknown as ProfitSnapshotRow[];

    const snapshots = snapshotRows.map(mapSnapshot);

    return NextResponse.json({
      success: true,
      eventId,
      snapshots,
    });
  } catch (error: unknown) {
    console.error("GET profit snapshot error:", error);

    return NextResponse.json(
      {
        success: false,
        snapshots: [],
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getSafeCurrentUser(request);
    const { eventId } = await context.params;
    const body = await readJsonBody<ProfitSnapshotBody>(request);

    await ensureProfitSnapshotTable();

    const hasAccess = await ensureEventAccess(eventId, currentUser.company_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const metrics = await getProfitMetrics(eventId, currentUser.company_id);

    const laborCost = toNumber(body.laborCost ?? body.labor_cost, 0);
    const packagingCost = toNumber(
      body.packagingCost ?? body.packaging_cost,
      0,
    );
    const deliveryCost = toNumber(body.deliveryCost ?? body.delivery_cost, 0);
    const otherCost = toNumber(body.otherCost ?? body.other_cost, 0);
    const guestCount = Math.round(
      toNumber(body.guestCount ?? body.guest_count, metrics.guestCount),
    );
    const snapshotType = cleanText(
      body.snapshotType ?? body.snapshot_type,
      "event_page",
    );
    const notes = cleanNullableText(body.notes);

    const totalCost =
      metrics.foodCost + laborCost + packagingCost + deliveryCost + otherCost;
    const grossProfit = metrics.revenue - totalCost;
    const marginPercent =
      metrics.revenue > 0 ? (grossProfit / metrics.revenue) * 100 : 0;

    const insertedRows = (await sql`
      INSERT INTO event_pnl_snapshots (
        company_id,
        event_id,
        revenue,
        food_cost,
        labor_cost,
        packaging_cost,
        delivery_cost,
        other_cost,
        total_cost,
        gross_profit,
        margin_percent,
        menu_items_count,
        guest_count,
        snapshot_type,
        notes,
        created_at
      )
      VALUES (
        ${currentUser.company_id},
        ${eventId},
        ${metrics.revenue},
        ${metrics.foodCost},
        ${laborCost},
        ${packagingCost},
        ${deliveryCost},
        ${otherCost},
        ${totalCost},
        ${grossProfit},
        ${marginPercent},
        ${metrics.menuItemsCount},
        ${guestCount},
        ${snapshotType},
        ${notes},
        NOW()
      )
      RETURNING
        id,
        company_id,
        event_id,
        revenue,
        food_cost,
        labor_cost,
        packaging_cost,
        delivery_cost,
        other_cost,
        total_cost,
        gross_profit,
        margin_percent,
        menu_items_count,
        guest_count,
        snapshot_type,
        notes,
        created_at;
    `) as unknown as ProfitSnapshotRow[];

    const snapshot = mapSnapshot(insertedRows[0]);

    return NextResponse.json({
      success: true,
      eventId,
      snapshot,
    });
  } catch (error: unknown) {
    console.error("POST profit snapshot error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}