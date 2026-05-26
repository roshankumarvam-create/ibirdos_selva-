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

type CurrentUser = {
  id: string;
  email: string;
  role?: string;
  company_id: string;
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

type EventResponse = {
  id: string;
  companyId: string;
  name: string;
  eventName: string;
  eventDate: string;
  guestCount: number;
  status: string;
  menuId: string | null;
  serviceType: string;
  totalCost: number;
  revenue: number;
  foodCost: number;
  margin: number;
  createdAt: string | null;
  updatedAt: string | null;
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

function getString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
}

function numberFromValue(value: string | number | null): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);

    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return 0;
}

function mapEvent(row: EventRow): EventResponse {
  const eventName = row.event_name ?? row.name ?? "Untitled Event";

  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name ?? eventName,
    eventName,
    eventDate: row.event_date ?? "",
    guestCount: numberFromValue(row.guest_count),
    status: row.status ?? "draft",
    menuId: row.menu_id,
    serviceType: row.service_type ?? "catering",
    totalCost: numberFromValue(row.total_cost),
    revenue: numberFromValue(row.revenue),
    foodCost: numberFromValue(row.food_cost),
    margin: numberFromValue(row.margin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown events route error";
}

async function ensureEventCoreColumns(): Promise<void> {
  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS event_name TEXT,
    ADD COLUMN IF NOT EXISTS event_date DATE,
    ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS menu_id UUID,
    ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'catering',
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS food_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;
}

export async function GET(): Promise<NextResponse> {
  try {
    await ensureEventCoreColumns();

    const currentUser = (await getCurrentUser()) as CurrentUser | null;

    if (!currentUser?.company_id) {
      return NextResponse.json(
        {
          success: false,
          events: [],
          data: [],
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const rows = (await sql`
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
    `) as unknown as EventRow[];

    const events = rows.map(mapEvent);

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

    const currentUser = (await getCurrentUser()) as CurrentUser | null;
    const body = (await request.json()) as CreateEventBody;

    if (!currentUser?.company_id) {
      return NextResponse.json(
        {
          success: false,
          event: null,
          data: null,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const eventName =
      getString(body.name) ??
      getString(body.eventName) ??
      getString(body.event_name) ??
      "Untitled Event";

    const eventDate =
      getString(body.date) ??
      getString(body.eventDate) ??
      getString(body.event_date);

    const guestCount =
      getNumber(body.guestCount) ?? getNumber(body.guest_count) ?? 0;

    const status = (getString(body.status) ?? "DRAFT").toUpperCase();

    const serviceType =
      getString(body.serviceType) ?? getString(body.service_type) ?? "catering";

    const revenue = getNumber(body.revenue) ?? 0;
    const foodCost = getNumber(body.foodCost) ?? getNumber(body.food_cost) ?? 0;
    const totalCost =
      getNumber(body.totalCost) ?? getNumber(body.total_cost) ?? foodCost;
    const margin = getNumber(body.margin) ?? 0;

    const rows = (await sql`
      INSERT INTO events (
        company_id,
        name,
        event_name,
        event_date,
        guest_count,
        status,
        service_type,
        revenue,
        food_cost,
        total_cost,
        margin,
        created_at,
        updated_at
      )
      VALUES (
        ${currentUser.company_id}::uuid,
        ${eventName},
        ${eventName},
        ${eventDate}::date,
        ${guestCount},
        ${status},
        ${serviceType},
        ${revenue},
        ${foodCost},
        ${totalCost},
        ${margin},
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
    `) as unknown as EventRow[];

    const event = mapEvent(rows[0]);

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
        event: null,
        data: null,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}