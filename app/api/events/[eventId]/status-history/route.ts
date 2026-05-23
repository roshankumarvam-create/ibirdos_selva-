import { NextRequest, NextResponse } from "next/server";
import { Pool, PoolClient } from "pg";
import { getSessionFromRequest } from "../../../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type EventRow = {
  id: string;
  company_id: string;
};

type StatusHistoryRow = {
  id: string;
  company_id: string;
  event_id: string;
  changed_by_user_id: string | null;
  changed_by_email: string | null;
  old_status: string | null;
  new_status: string;
  note: string | null;
  created_at: Date | string | null;
};

const databaseUrl = process.env.DATABASE_URL ?? "";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.length > 0 && !databaseUrl.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
});

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

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        success: false,
        history: [],
        data: [],
        error: "DATABASE_URL is missing",
      },
      { status: 500 },
    );
  }

  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      {
        success: false,
        history: [],
        data: [],
        error: "Not logged in",
      },
      { status: 401 },
    );
  }

  const { eventId } = await context.params;
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    await ensureEventStatusHistoryTable(client);

    const eventResult = await client.query<EventRow>(
      `
        SELECT id, company_id
        FROM events
        WHERE id = $1
          AND company_id = $2
        LIMIT 1
      `,
      [eventId, session.company_id],
    );

    const event = eventResult.rows[0];

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          history: [],
          data: [],
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const historyResult = await client.query<StatusHistoryRow>(
      `
        SELECT
          id,
          company_id,
          event_id,
          changed_by_user_id,
          changed_by_email,
          old_status,
          new_status,
          note,
          created_at
        FROM event_status_history
        WHERE company_id = $1
          AND event_id = $2
        ORDER BY created_at DESC NULLS LAST
        LIMIT 50
      `,
      [session.company_id, eventId],
    );

    return NextResponse.json({
      success: true,
      history: historyResult.rows,
      data: historyResult.rows,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        history: [],
        data: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to load event status history",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}