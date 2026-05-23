import { NextRequest, NextResponse } from "next/server";
import { Pool, PoolClient } from "pg";
import { getSessionFromRequest } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

type CurrentEventRow = {
  id: string;
  company_id: string;
  status: EventStatus | null;
};

type StatusRequestBody = {
  status?: unknown;
  note?: unknown;
};

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

const databaseUrl = process.env.DATABASE_URL ?? "";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.length > 0 && !databaseUrl.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
});

const allowedStatuses: EventStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "INVOICED",
  "PAID",
  "QUOTED",
];

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function isEventStatus(value: string): value is EventStatus {
  return allowedStatuses.includes(value as EventStatus);
}

async function ensureEventStatusHistoryTable(
  client: PoolClient,
): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS event_status_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID NOT NULL,
      changed_by_user_id UUID,
      changed_by_email TEXT,
      old_status TEXT,
      new_status TEXT NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    ALTER TABLE event_status_history
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS changed_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS changed_by_email TEXT,
    ADD COLUMN IF NOT EXISTS old_status TEXT,
    ADD COLUMN IF NOT EXISTS new_status TEXT,
    ADD COLUMN IF NOT EXISTS note TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
  `);
}

async function ensureEventStatusEnumValues(client: PoolClient): Promise<void> {
  await client.query(
    `ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'INVOICED'`,
  ); // CHANGED

  await client.query(
    `ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'PAID'`,
  ); // CHANGED

  await client.query(
    `ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'COMPLETED'`,
  ); // CHANGED
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is missing" },
      { status: 500 },
    );
  }

  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Not logged in" },
      { status: 401 },
    );
  }

  const { eventId } = await context.params;
  const body = (await request.json()) as StatusRequestBody;
  const requestedStatus = getString(body.status);
  const note = getString(body.note);

  if (!requestedStatus || !isEventStatus(requestedStatus)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Status must be one of DRAFT, PENDING_APPROVAL, APPROVED, CONFIRMED, COMPLETED, CANCELLED, INVOICED, PAID, QUOTED.",
      },
      { status: 400 },
    );
  }

  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    await ensureEventStatusHistoryTable(client);
    await ensureEventStatusEnumValues(client); // CHANGED

    await client.query("BEGIN");

    const currentEventResult = await client.query<CurrentEventRow>(
      `
        SELECT id, company_id, status
        FROM events
        WHERE id = $1
          AND company_id = $2
        LIMIT 1
      `,
      [eventId, session.company_id],
    );

    const currentEvent = currentEventResult.rows[0];

    if (!currentEvent) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    const oldStatus = currentEvent.status ?? "DRAFT";

    const updatedEventResult = await client.query(
      `
        UPDATE events
        SET
          status = $1,
          updated_at = NOW()
        WHERE id = $2
          AND company_id = $3
        RETURNING *
      `,
      [requestedStatus, eventId, session.company_id],
    );

    await client.query(
      `
        INSERT INTO event_status_history (
          company_id,
          event_id,
          changed_by_user_id,
          changed_by_email,
          old_status,
          new_status,
          note,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `,
      [
        session.company_id,
        eventId,
        session.user_id,
        session.email,
        oldStatus,
        requestedStatus,
        note,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      event: updatedEventResult.rows[0] ?? null,
      statusChange: {
        eventId,
        oldStatus,
        newStatus: requestedStatus,
        note,
      },
    });
  } catch (error: unknown) {
    if (client) {
      await client.query("ROLLBACK");
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update event status",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}