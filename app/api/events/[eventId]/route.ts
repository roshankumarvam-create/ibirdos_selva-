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
    eventId: string;
  }>;
};

type EventRow = {
  id: string;
  company_id: string;
  name: string | null;
  event_name: string | null;
  event_date: string | null;
  guest_count: string | number | null;
  status: string | null;
  menu_id: string | null;
  service_type: string | null;
  total_cost: string | number | null;
  revenue: string | number | null;
  food_cost: string | number | null;
  margin: string | number | null;
  created_at: string | null;
  updated_at: string | null;
};

type UpdateEventBody = {
  name?: unknown;
  eventName?: unknown;
  event_name?: unknown;
  date?: unknown;
  eventDate?: unknown;
  event_date?: unknown;
  guestCount?: unknown;
  guest_count?: unknown;
  status?: unknown;
  serviceType?: unknown;
  service_type?: unknown;
  revenue?: unknown;
  foodCost?: unknown;
  food_cost?: unknown;
  totalCost?: unknown;
  total_cost?: unknown;
  margin?: unknown;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown event detail API error";
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function mapEvent(row: EventRow) {
  return {
    id: row.id,
    company_id: row.company_id,
    companyId: row.company_id,
    name: row.name ?? row.event_name ?? "Untitled Event",
    eventName: row.event_name ?? row.name ?? "Untitled Event",
    event_name: row.event_name ?? row.name ?? "Untitled Event",
    event_date: row.event_date,
    eventDate: row.event_date,
    guest_count: row.guest_count,
    guestCount: row.guest_count,
    status: row.status ?? "DRAFT",
    menu_id: row.menu_id,
    menuId: row.menu_id,
    service_type: row.service_type,
    serviceType: row.service_type,
    total_cost: row.total_cost,
    totalCost: row.total_cost,
    revenue: row.revenue,
    food_cost: row.food_cost,
    foodCost: row.food_cost,
    margin: row.margin,
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

async function ensureEventDetailColumns(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      name TEXT,
      event_name TEXT,
      event_date TIMESTAMPTZ,
      guest_count NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'DRAFT',
      menu_id UUID,
      service_type TEXT,
      total_cost NUMERIC DEFAULT 0,
      revenue NUMERIC DEFAULT 0,
      food_cost NUMERIC DEFAULT 0,
      margin NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS event_name TEXT,
    ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS guest_count NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS menu_id UUID,
    ADD COLUMN IF NOT EXISTS service_type TEXT,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS food_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_events_company_id
    ON events(company_id);
  `;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  void request;

  try {
    await ensureEventDetailColumns();

    const currentUser = await getCurrentUser();
    const { eventId } = await context.params;

    const rows = await sql`
      SELECT
        id,
        company_id,
        name,
        event_name,
        event_date::text AS event_date,
        guest_count,
        status,
        menu_id,
        service_type,
        total_cost,
        revenue,
        food_cost,
        margin,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM events
      WHERE id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      LIMIT 1;
    `;

    const row = rows[0] as EventRow | undefined;

    if (!row) {
      return NextResponse.json(
        {
          success: false,
          event: null,
          data: null,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const event = mapEvent(row);

    return NextResponse.json({
      success: true,
      event,
      data: event,
    });
  } catch (error: unknown) {
    console.error("GET /api/events/[eventId] error:", error);

    return NextResponse.json(
      {
        success: false,
        event: null,
        data: null,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    await ensureEventDetailColumns();

    const currentUser = await getCurrentUser();
    const { eventId } = await context.params;
    const body = (await request.json()) as UpdateEventBody;

    const eventName =
      getString(body.name) ??
      getString(body.eventName) ??
      getString(body.event_name);

    const eventDate =
      getString(body.date) ??
      getString(body.eventDate) ??
      getString(body.event_date);

    const guestCount =
      getNumber(body.guestCount) ?? getNumber(body.guest_count);

    const status = getString(body.status);
    const serviceType =
      getString(body.serviceType) ?? getString(body.service_type);

    const revenue = getNumber(body.revenue);
    const foodCost = getNumber(body.foodCost) ?? getNumber(body.food_cost);
    const totalCost = getNumber(body.totalCost) ?? getNumber(body.total_cost);
    const margin = getNumber(body.margin);

    const existingRows = await sql`
      SELECT id
      FROM events
      WHERE id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      LIMIT 1;
    `;

    if (existingRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          event: null,
          data: null,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const rows = await sql`
      UPDATE events
      SET
        name = COALESCE(${eventName}, name),
        event_name = COALESCE(${eventName}, event_name),
        event_date = COALESCE(${eventDate}, event_date),
        guest_count = COALESCE(${guestCount}, guest_count),
        status = COALESCE(${status}, status),
        service_type = COALESCE(${serviceType}, service_type),
        revenue = COALESCE(${revenue}, revenue),
        food_cost = COALESCE(${foodCost}, food_cost),
        total_cost = COALESCE(${totalCost}, total_cost),
        margin = COALESCE(${margin}, margin),
        updated_at = NOW()
      WHERE id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      RETURNING
        id,
        company_id,
        name,
        event_name,
        event_date::text AS event_date,
        guest_count,
        status,
        menu_id,
        service_type,
        total_cost,
        revenue,
        food_cost,
        margin,
        created_at::text AS created_at,
        updated_at::text AS updated_at;
    `;

    const event = mapEvent(rows[0] as EventRow);

    return NextResponse.json({
      success: true,
      event,
      data: event,
    });
  } catch (error: unknown) {
    console.error("PATCH /api/events/[eventId] error:", error);

    return NextResponse.json(
      {
        success: false,
        event: null,
        data: null,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}