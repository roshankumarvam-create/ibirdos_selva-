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

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type EventRow = {
  id: string;
  company_id: string;
  name: string;
  status: EventStatus | null;
  revenue: string | number | null;
  food_cost: string | number | null;
  total_cost: string | number | null;
  margin: string | number | null;
};

type EventTotalsRow = {
  revenue: string | number | null;
  food_cost: string | number | null;
};

type CustomerInvoiceRow = {
  id: string;
  company_id: string;
  event_id: string;
  invoice_number: string;
  status: string;
  revenue: string | number | null;
  food_cost: string | number | null;
  amount_due: string | number | null;
  margin: string | number | null;
  due_date: Date | string | null;
  sent_at: Date | string | null;
  paid_at: Date | string | null;
  created_by_user_id: string | null;
  created_by_email: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

type InvoiceRequestBody = {
  dueDate?: unknown;
  note?: unknown;
};

const databaseUrl = process.env.DATABASE_URL ?? "";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.length > 0 && !databaseUrl.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
});

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function roundNumber(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function createInvoiceNumber(eventId: string): string {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const eventPart = eventId.slice(0, 8).toUpperCase();

  return `IB-${datePart}-${eventPart}`;
}

async function ensureEventStatusEnumValues(client: PoolClient): Promise<void> {
  await client.query(
    `ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'INVOICED'`,
  );

  await client.query(`ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'PAID'`);

  await client.query(
    `ALTER TYPE event_status ADD VALUE IF NOT EXISTS 'COMPLETED'`,
  );
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

async function ensureCustomerInvoicesTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID NOT NULL,
      invoice_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SENT',
      revenue NUMERIC DEFAULT 0,
      food_cost NUMERIC DEFAULT 0,
      amount_due NUMERIC DEFAULT 0,
      margin NUMERIC DEFAULT 0,
      due_date TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      created_by_user_id UUID,
      created_by_email TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await client.query(`
    ALTER TABLE customer_invoices
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT,
    ADD COLUMN IF NOT EXISTS revenue NUMERIC,
    ADD COLUMN IF NOT EXISTS food_cost NUMERIC,
    ADD COLUMN IF NOT EXISTS amount_due NUMERIC,
    ADD COLUMN IF NOT EXISTS margin NUMERIC,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID,
    ADD COLUMN IF NOT EXISTS created_by_email TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS customer_invoices_company_event_unique
    ON customer_invoices (company_id, event_id)
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
        invoice: null,
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
        invoice: null,
        error: "Not logged in",
      },
      { status: 401 },
    );
  }

  const { eventId } = await context.params;
  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    await ensureCustomerInvoicesTable(client);

    const invoiceResult = await client.query<CustomerInvoiceRow>(
      `
        SELECT *
        FROM customer_invoices
        WHERE company_id = $1
          AND event_id = $2
        LIMIT 1
      `,
      [session.company_id, eventId],
    );

    return NextResponse.json({
      success: true,
      invoice: invoiceResult.rows[0] ?? null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        invoice: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load customer invoice",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        success: false,
        invoice: null,
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
        invoice: null,
        error: "Not logged in",
      },
      { status: 401 },
    );
  }

  const { eventId } = await context.params;

  let body: InvoiceRequestBody = {};

  try {
    body = (await request.json()) as InvoiceRequestBody;
  } catch {
    body = {};
  }

  const dueDate = getString(body.dueDate);
  const note =
    getString(body.note) ?? "Customer invoice created and sent for payment";

  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    await ensureCustomerInvoicesTable(client);
    await ensureEventStatusHistoryTable(client);
    await ensureEventStatusEnumValues(client);

    await client.query("BEGIN");

    const eventResult = await client.query<EventRow>(
      `
        SELECT
          id,
          company_id,
          name,
          status,
          revenue,
          food_cost,
          total_cost,
          margin
        FROM events
        WHERE id = $1
          AND company_id = $2
        LIMIT 1
      `,
      [eventId, session.company_id],
    );

    const event = eventResult.rows[0];

    if (!event) {
      await client.query("ROLLBACK");

      return NextResponse.json(
        {
          success: false,
          invoice: null,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const totalsResult = await client.query<EventTotalsRow>(
      `
        SELECT
          COALESCE(SUM(revenue), 0) AS revenue,
          COALESCE(SUM(food_cost), 0) AS food_cost
        FROM event_recipe_lines
        WHERE company_id = $1
          AND event_id = $2
      `,
      [session.company_id, eventId],
    );

    const lineTotals = totalsResult.rows[0];

    const eventRevenue = toNumber(event.revenue);
    const eventFoodCost = toNumber(event.food_cost);
    const eventTotalCost = toNumber(event.total_cost);
    const lineRevenue = toNumber(lineTotals?.revenue);
    const lineFoodCost = toNumber(lineTotals?.food_cost);

    const revenue = roundNumber(eventRevenue > 0 ? eventRevenue : lineRevenue);
    const foodCost = roundNumber(
      eventFoodCost > 0
        ? eventFoodCost
        : lineFoodCost > 0
          ? lineFoodCost
          : eventTotalCost,
    );

    const margin =
      revenue > 0 ? roundNumber(((revenue - foodCost) / revenue) * 100) : 0;

    const invoiceNumber = createInvoiceNumber(eventId);
    const oldStatus = event.status ?? "DRAFT";

    const invoiceResult = await client.query<CustomerInvoiceRow>(
      `
        INSERT INTO customer_invoices (
          company_id,
          event_id,
          invoice_number,
          status,
          revenue,
          food_cost,
          amount_due,
          margin,
          due_date,
          sent_at,
          created_by_user_id,
          created_by_email,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'SENT',
          $4,
          $5,
          $6,
          $7,
          $8,
          NOW(),
          $9,
          $10,
          NOW(),
          NOW()
        )
        ON CONFLICT (company_id, event_id)
        DO UPDATE SET
          status = 'SENT',
          revenue = EXCLUDED.revenue,
          food_cost = EXCLUDED.food_cost,
          amount_due = EXCLUDED.amount_due,
          margin = EXCLUDED.margin,
          due_date = EXCLUDED.due_date,
          sent_at = NOW(),
          created_by_user_id = EXCLUDED.created_by_user_id,
          created_by_email = EXCLUDED.created_by_email,
          updated_at = NOW()
        RETURNING *
      `,
      [
        session.company_id,
        eventId,
        invoiceNumber,
        revenue,
        foodCost,
        revenue,
        margin,
        dueDate,
        session.user_id,
        session.email,
      ],
    );

    const updatedEventResult = await client.query<EventRow>(
      `
        UPDATE events
        SET
          status = 'INVOICED',
          revenue = $1,
          food_cost = $2,
          total_cost = $2,
          margin = $3,
          updated_at = NOW()
        WHERE id = $4
          AND company_id = $5
        RETURNING *
      `,
      [revenue, foodCost, margin, eventId, session.company_id],
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
        VALUES ($1, $2, $3, $4, $5, 'INVOICED', $6, NOW())
      `,
      [
        session.company_id,
        eventId,
        session.user_id,
        session.email,
        oldStatus,
        note,
      ],
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      invoice: invoiceResult.rows[0] ?? null,
      event: updatedEventResult.rows[0] ?? null,
      statusChange: {
        eventId,
        oldStatus,
        newStatus: "INVOICED",
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
        invoice: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create customer invoice",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}