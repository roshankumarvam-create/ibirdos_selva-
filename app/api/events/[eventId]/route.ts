import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getCurrentUser } from "@/app/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type EventStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "INVOICED"
  | "PAID"
  | "QUOTED";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type CurrentUser = {
  id: string;
  email: string;
  role?: string;
  company_id: string;
};

type EventBody = {
  name?: string;
  eventName?: string;
  event_name?: string;
  eventDate?: string;
  event_date?: string;
  guestCount?: number | string;
  guest_count?: number | string;
  status?: string;
  serviceType?: string;
  service_type?: string;
  revenue?: number | string;
  foodCost?: number | string;
  food_cost?: number | string;
  totalCost?: number | string;
  total_cost?: number | string;
  margin?: number | string;
};

type EventRow = {
  id: string;
  company_id: string;
  name: string | null;
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
  company_id: string;
  name: string;
  eventName: string;
  event_name: string;
  eventDate: string | null;
  event_date: string | null;
  guestCount: number;
  guest_count: number;
  status: string;
  menuId: string | null;
  menu_id: string | null;
  serviceType: string;
  service_type: string;
  totalCost: number;
  total_cost: number;
  revenue: number;
  foodCost: number;
  food_cost: number;
  margin: number;
  createdAt: string | null;
  created_at: string | null;
  updatedAt: string | null;
  updated_at: string | null;
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

  return "Unknown event error";
}

function getResponseStatus(error: unknown): number {
  return error instanceof UnauthorizedError ? 401 : 500;
}

function cleanText(value: unknown, fallback = ""): string {
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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(/[$,%\s,]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function cleanStatus(value: unknown): EventStatus {
  const status = cleanText(value, "DRAFT").toUpperCase();

  if (
    status === "DRAFT" ||
    status === "PENDING_APPROVAL" ||
    status === "APPROVED" ||
    status === "CONFIRMED" ||
    status === "COMPLETED" ||
    status === "CANCELLED" ||
    status === "INVOICED" ||
    status === "PAID" ||
    status === "QUOTED"
  ) {
    return status;
  }

  return "DRAFT";
}

async function readJsonBody<TBody>(request: NextRequest): Promise<TBody> {
  try {
    return (await request.json()) as TBody;
  } catch {
    return {} as TBody;
  }
}

async function getSafeCurrentUser(): Promise<CurrentUser> {
  const currentUser = (await getCurrentUser()) as Partial<CurrentUser> | null;

  if (
    !currentUser ||
    typeof currentUser.company_id !== "string" ||
    currentUser.company_id.trim().length === 0
  ) {
    throw new UnauthorizedError();
  }

  return {
    id: typeof currentUser.id === "string" ? currentUser.id : "",
    email: typeof currentUser.email === "string" ? currentUser.email : "",
    role: typeof currentUser.role === "string" ? currentUser.role : "user",
    company_id: currentUser.company_id,
  };
}

async function ensureEventsColumns(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        CREATE TYPE event_status AS ENUM (
          'DRAFT',
          'PENDING_APPROVAL',
          'APPROVED',
          'CONFIRMED',
          'COMPLETED',
          'CANCELLED',
          'INVOICED',
          'PAID',
          'QUOTED'
        );
      END IF;
    END
    $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID,
      name TEXT,
      event_date DATE,
      guest_count NUMERIC DEFAULT 0,
      status event_status DEFAULT 'DRAFT',
      menu_id UUID,
      service_type TEXT DEFAULT 'Catering',
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
    ADD COLUMN IF NOT EXISTS event_date DATE,
    ADD COLUMN IF NOT EXISTS guest_count NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status event_status DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS menu_id UUID,
    ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'Catering',
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

function mapEvent(row: EventRow): EventResponse {
  return {
    id: row.id,
    companyId: row.company_id,
    company_id: row.company_id,
    name: row.name ?? "",
    eventName: row.name ?? "",
    event_name: row.name ?? "",
    eventDate: row.event_date,
    event_date: row.event_date,
    guestCount: toNumber(row.guest_count, 0),
    guest_count: toNumber(row.guest_count, 0),
    status: row.status ?? "DRAFT",
    menuId: row.menu_id,
    menu_id: row.menu_id,
    serviceType: row.service_type ?? "Catering",
    service_type: row.service_type ?? "Catering",
    totalCost: toNumber(row.total_cost, 0),
    total_cost: toNumber(row.total_cost, 0),
    revenue: toNumber(row.revenue, 0),
    foodCost: toNumber(row.food_cost, 0),
    food_cost: toNumber(row.food_cost, 0),
    margin: toNumber(row.margin, 0),
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  void request;

  try {
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;

    await ensureEventsColumns();

    const rows = await sql<EventRow[]>`
      SELECT
        id::text,
        company_id::text,
        name,
        event_date::text AS event_date,
        guest_count,
        status::text AS status,
        menu_id::text,
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
      LIMIT 1
    `;

    if (rows.length === 0) {
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

    const event = mapEvent(rows[0]);

    return NextResponse.json({
      success: true,
      event,
      data: event,
    });
  } catch (error: unknown) {
    console.error("GET event detail error:", error);

    return NextResponse.json(
      {
        success: false,
        event: null,
        data: null,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;
    const body = await readJsonBody<EventBody>(request);

    await ensureEventsColumns();

    const name = cleanText(body.name ?? body.eventName ?? body.event_name);
    const eventDate = cleanNullableText(body.eventDate ?? body.event_date);
    const guestCount =
      body.guestCount !== undefined || body.guest_count !== undefined
        ? toNumber(body.guestCount ?? body.guest_count, 0)
        : null;
    const status = body.status !== undefined ? cleanStatus(body.status) : null;
    const serviceType =
      body.serviceType !== undefined || body.service_type !== undefined
        ? cleanText(body.serviceType ?? body.service_type, "Catering")
        : null;
    const revenue = body.revenue !== undefined ? toNumber(body.revenue, 0) : null;
    const foodCost =
      body.foodCost !== undefined || body.food_cost !== undefined
        ? toNumber(body.foodCost ?? body.food_cost, 0)
        : null;
    const totalCost =
      body.totalCost !== undefined || body.total_cost !== undefined
        ? toNumber(body.totalCost ?? body.total_cost, 0)
        : null;
    const margin = body.margin !== undefined ? toNumber(body.margin, 0) : null;

    const rows = await sql<EventRow[]>`
      UPDATE events
      SET
        name = CASE WHEN ${name} <> '' THEN ${name} ELSE name END,
        event_date = COALESCE(${eventDate}::date, event_date),
        guest_count = COALESCE(${guestCount}::numeric, guest_count),
        status = COALESCE(${status}::event_status, status),
        service_type = COALESCE(${serviceType}, service_type),
        revenue = COALESCE(${revenue}::numeric, revenue),
        food_cost = COALESCE(${foodCost}::numeric, food_cost),
        total_cost = COALESCE(${totalCost}::numeric, total_cost),
        margin = COALESCE(${margin}::numeric, margin),
        updated_at = NOW()
      WHERE id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      RETURNING
        id::text,
        company_id::text,
        name,
        event_date::text AS event_date,
        guest_count,
        status::text AS status,
        menu_id::text,
        service_type,
        total_cost,
        revenue,
        food_cost,
        margin,
        created_at::text AS created_at,
        updated_at::text AS updated_at
    `;

    if (rows.length === 0) {
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

    const event = mapEvent(rows[0]);

    return NextResponse.json({
      success: true,
      event,
      data: event,
    });
  } catch (error: unknown) {
    console.error("PATCH event detail error:", error);

    return NextResponse.json(
      {
        success: false,
        event: null,
        data: null,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  void request;

  try {
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;

    await ensureEventsColumns();

    await sql`
      DELETE FROM events
      WHERE id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
    `;

    return NextResponse.json({
      success: true,
      eventId,
    });
  } catch (error: unknown) {
    console.error("DELETE event detail error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}