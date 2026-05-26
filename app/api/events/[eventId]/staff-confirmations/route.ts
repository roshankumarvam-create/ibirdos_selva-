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

type StaffConfirmationType =
  | "PACKET_REVIEWED"
  | "STATION_REVIEWED"
  | "PREP_QUANTITIES_REVIEWED"
  | "DELIVERY_NOTES_REVIEWED"
  | "TASK_COMPLETED";

type StaffConfirmationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "NEEDS_HELP"
  | "BLOCKED";

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

type StaffConfirmationBody = {
  eventRecipeLineId?: string | null;
  event_recipe_line_id?: string | null;
  staffName?: string;
  staff_name?: string;
  station?: string;
  confirmationType?: string;
  confirmation_type?: string;
  status?: string;
  notes?: string | null;
};

type UpdateStaffConfirmationBody = {
  id?: string;
  status?: string;
  notes?: string | null;
};

type EventRow = {
  id: string;
  company_id: string | null;
};

type StaffConfirmationRow = {
  id: string;
  company_id: string;
  event_id: string;
  event_recipe_line_id: string | null;
  staff_name: string;
  station: string;
  confirmation_type: string;
  status: string;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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

  return "Unknown staff confirmation error";
}

function getResponseStatus(error: unknown): number {
  return error instanceof UnauthorizedError ? 401 : 500;
}

function isStaffConfirmationType(
  value: string,
): value is StaffConfirmationType {
  return [
    "PACKET_REVIEWED",
    "STATION_REVIEWED",
    "PREP_QUANTITIES_REVIEWED",
    "DELIVERY_NOTES_REVIEWED",
    "TASK_COMPLETED",
  ].includes(value);
}

function isStaffConfirmationStatus(
  value: string,
): value is StaffConfirmationStatus {
  return ["PENDING", "CONFIRMED", "NEEDS_HELP", "BLOCKED"].includes(value);
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

async function getSafeCurrentUser(): Promise<CurrentUser> {
  const currentUser = (await getCurrentUser()) as Partial<CurrentUser> | null;

  if (
    !currentUser ||
    typeof currentUser.id !== "string" ||
    typeof currentUser.email !== "string" ||
    typeof currentUser.company_id !== "string" ||
    currentUser.company_id.trim().length === 0
  ) {
    throw new UnauthorizedError();
  }

  return {
    id: currentUser.id,
    email: currentUser.email,
    role: typeof currentUser.role === "string" ? currentUser.role : "user",
    company_id: currentUser.company_id,
  };
}

async function ensureStaffConfirmationTable(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS staff_confirmations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID NOT NULL,
      event_recipe_line_id UUID,
      staff_name TEXT NOT NULL,
      station TEXT NOT NULL,
      confirmation_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      confirmed_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE staff_confirmations
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS event_recipe_line_id UUID,
    ADD COLUMN IF NOT EXISTS staff_name TEXT,
    ADD COLUMN IF NOT EXISTS station TEXT,
    ADD COLUMN IF NOT EXISTS confirmation_type TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_staff_confirmations_company_event
    ON staff_confirmations(company_id, event_id);
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

function mapConfirmation(row: StaffConfirmationRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    company_id: row.company_id,
    eventId: row.event_id,
    event_id: row.event_id,
    eventRecipeLineId: row.event_recipe_line_id,
    event_recipe_line_id: row.event_recipe_line_id,
    staffName: row.staff_name,
    staff_name: row.staff_name,
    station: row.station,
    confirmationType: row.confirmation_type,
    confirmation_type: row.confirmation_type,
    status: row.status,
    confirmedAt: row.confirmed_at,
    confirmed_at: row.confirmed_at,
    notes: row.notes,
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

    await ensureStaffConfirmationTable();

    const hasAccess = await ensureEventAccess(eventId, currentUser.company_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          eventId,
          confirmations: [],
          summary: {
            total: 0,
            pending: 0,
            confirmed: 0,
            needs_help: 0,
            blocked: 0,
          },
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const confirmationRows = (await sql`
      SELECT
        id,
        company_id,
        event_id,
        event_recipe_line_id,
        staff_name,
        station,
        confirmation_type,
        status,
        confirmed_at::text AS confirmed_at,
        notes,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM staff_confirmations
      WHERE company_id::text = ${currentUser.company_id}
        AND event_id::text = ${eventId}
      ORDER BY station ASC, staff_name ASC, confirmation_type ASC;
    `) as unknown as StaffConfirmationRow[];

    const summaryRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed,
        COUNT(*) FILTER (WHERE status = 'NEEDS_HELP')::int AS needs_help,
        COUNT(*) FILTER (WHERE status = 'BLOCKED')::int AS blocked
      FROM staff_confirmations
      WHERE company_id::text = ${currentUser.company_id}
        AND event_id::text = ${eventId};
    `;

    return NextResponse.json({
      success: true,
      eventId,
      confirmations: confirmationRows.map(mapConfirmation),
      summary: summaryRows[0] ?? {
        total: 0,
        pending: 0,
        confirmed: 0,
        needs_help: 0,
        blocked: 0,
      },
    });
  } catch (error: unknown) {
    console.error("GET staff confirmations error:", error);

    return NextResponse.json(
      {
        success: false,
        confirmations: [],
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
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;
    const body = await readJsonBody<StaffConfirmationBody>(request);

    await ensureStaffConfirmationTable();

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

    const staffName = cleanText(body.staffName ?? body.staff_name);
    const station = cleanText(body.station);
    const confirmationType = cleanText(
      body.confirmationType ?? body.confirmation_type,
    );
    const status = cleanText(body.status) || "CONFIRMED";
    const notes = cleanNullableText(body.notes);
    const eventRecipeLineId = cleanNullableText(
      body.eventRecipeLineId ?? body.event_recipe_line_id,
    );

    if (!staffName) {
      return NextResponse.json(
        { success: false, error: "Staff name is required" },
        { status: 400 },
      );
    }

    if (!station) {
      return NextResponse.json(
        { success: false, error: "Station is required" },
        { status: 400 },
      );
    }

    if (!isStaffConfirmationType(confirmationType)) {
      return NextResponse.json(
        { success: false, error: "Invalid confirmation type" },
        { status: 400 },
      );
    }

    if (!isStaffConfirmationStatus(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid confirmation status" },
        { status: 400 },
      );
    }

    const updatedRows = (await sql`
      UPDATE staff_confirmations
      SET
        status = ${status},
        confirmed_at = CASE
          WHEN ${status} = 'CONFIRMED' THEN NOW()
          ELSE NULL
        END,
        notes = ${notes},
        updated_at = NOW()
      WHERE company_id::text = ${currentUser.company_id}
        AND event_id::text = ${eventId}
        AND COALESCE(event_recipe_line_id::text, '') = COALESCE(${eventRecipeLineId}, '')
        AND staff_name = ${staffName}
        AND station = ${station}
        AND confirmation_type = ${confirmationType}
      RETURNING
        id,
        company_id,
        event_id,
        event_recipe_line_id,
        staff_name,
        station,
        confirmation_type,
        status,
        confirmed_at::text AS confirmed_at,
        notes,
        created_at::text AS created_at,
        updated_at::text AS updated_at;
    `) as unknown as StaffConfirmationRow[];

    if (updatedRows.length > 0) {
      return NextResponse.json({
        success: true,
        eventId,
        confirmation: mapConfirmation(updatedRows[0]),
      });
    }

    const insertedRows = (await sql`
      INSERT INTO staff_confirmations (
        company_id,
        event_id,
        event_recipe_line_id,
        staff_name,
        station,
        confirmation_type,
        status,
        confirmed_at,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        ${currentUser.company_id},
        ${eventId},
        ${eventRecipeLineId},
        ${staffName},
        ${station},
        ${confirmationType},
        ${status},
        CASE
          WHEN ${status} = 'CONFIRMED' THEN NOW()
          ELSE NULL
        END,
        ${notes},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        company_id,
        event_id,
        event_recipe_line_id,
        staff_name,
        station,
        confirmation_type,
        status,
        confirmed_at::text AS confirmed_at,
        notes,
        created_at::text AS created_at,
        updated_at::text AS updated_at;
    `) as unknown as StaffConfirmationRow[];

    return NextResponse.json({
      success: true,
      eventId,
      confirmation: mapConfirmation(insertedRows[0]),
    });
  } catch (error: unknown) {
    console.error("POST staff confirmations error:", error);

    return NextResponse.json(
      {
        success: false,
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
    const body = await readJsonBody<UpdateStaffConfirmationBody>(request);

    await ensureStaffConfirmationTable();

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

    const id = cleanText(body.id);
    const status = cleanText(body.status);
    const notes = cleanNullableText(body.notes);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Confirmation id is required" },
        { status: 400 },
      );
    }

    if (!isStaffConfirmationStatus(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid confirmation status" },
        { status: 400 },
      );
    }

    const updatedRows = (await sql`
      UPDATE staff_confirmations
      SET
        status = ${status},
        notes = ${notes},
        confirmed_at = CASE
          WHEN ${status} = 'CONFIRMED' THEN NOW()
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE id::text = ${id}
        AND event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      RETURNING
        id,
        company_id,
        event_id,
        event_recipe_line_id,
        staff_name,
        station,
        confirmation_type,
        status,
        confirmed_at::text AS confirmed_at,
        notes,
        created_at::text AS created_at,
        updated_at::text AS updated_at;
    `) as unknown as StaffConfirmationRow[];

    if (updatedRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Confirmation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      eventId,
      confirmation: mapConfirmation(updatedRows[0]),
    });
  } catch (error: unknown) {
    console.error("PATCH staff confirmations error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}