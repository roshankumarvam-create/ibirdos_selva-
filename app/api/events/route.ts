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

type CreateEventBody = {
  name?: unknown;
  eventName?: unknown;
  event_name?: unknown;
  date?: unknown;
  eventDate?: unknown;
  event_date?: unknown;
  guestCount?: unknown;
  guest_count?: unknown;
  serviceType?: unknown;
  service_type?: unknown;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown events API error";
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

async function ensureEventCoreColumns(): Promise<void> {
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

  await sql`
    CREATE INDEX IF NOT EXISTS idx_events_event_date
    ON events(event_date);
  `;
}

export async function GET(): Promise<NextResponse> {
  try {
    await ensureEventCoreColumns();

    const currentUser = await getCurrentUser();

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
      WHERE company_id::text = ${currentUser.company_id}
      ORDER BY event_date DESC NULLS LAST, created_at DESC NULLS LAST;
    `;

    const events = (rows as unknown as EventRow[]).map(mapEvent);

    return NextResponse.json({
      success: true,
      events,
      data: events,
    });
  } catch (error: unknown) {
    console.error("GET /api/events error:", error);

    return NextResponse.json(
      {
        success: false,
        events: [],
        data: [],
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await ensureEventCoreColumns();

    const currentUser = await getCurrentUser();
    const body = (await request.json()) as CreateEventBody;

    const eventName =
      getString(body.name) ??
      getString(body.eventName) ??
      getString(body.event_name);

    const eventDate =
      getString(body.date) ??
      getString(body.eventDate) ??
      getString(body.event_date);

    const guestCount =
      getNumber(body.guestCount) ?? getNumber(body.guest_count) ?? 0;

    const serviceType =
      getString(body.serviceType) ?? getString(body.service_type) ?? "Catering";

    if (!eventName) {
      return NextResponse.json(
        {
          success: false,
          error: "Event name is required",
        },
        { status: 400 },
      );
    }

    if (!eventDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Event date is required",
        },
        { status: 400 },
      );
    }

    const rows = await sql`
      INSERT INTO events (
        company_id,
        name,
        event_name,
        event_date,
        guest_count,
        status,
        service_type,
        total_cost,
        revenue,
        food_cost,
        margin,
        created_at,
        updated_at
      )
      VALUES (
        ${currentUser.company_id},
        ${eventName},
        ${eventName},
        ${eventDate},
        ${guestCount},
        'DRAFT',
        ${serviceType},
        0,
        0,
        0,
        0,
        NOW(),
        NOW()
      )
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
    console.error("POST /api/events error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}