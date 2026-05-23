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

type SessionUser = {
  user_id?: string;
  email?: string;
  role?: string;
  company_id?: string;
};

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

type RequestApprovalBody = {
  quoteId?: string;
  eventId?: string;
  foodCostPercent?: number;
  marginPercent?: number;
  total?: number;
  grossProfit?: number;
};

type ApprovalAlertMetadata = {
  foodCostPercent: number;
  marginPercent: number;
  total: number;
  grossProfit: number;
  approvalRule: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown approval error";
}

function getStatusCode(error: unknown): number {
  if (error instanceof Error && error.message === "Not authenticated") {
    return 401;
  }

  return 500;
}

async function getCurrentUser(request: NextRequest): Promise<CurrentUser> {
  const session = (await getSessionFromRequest(request)) as SessionUser | null;

  if (
    !session ||
    typeof session.user_id !== "string" ||
    typeof session.email !== "string" ||
    typeof session.role !== "string" ||
    typeof session.company_id !== "string" ||
    session.company_id.trim().length === 0
  ) {
    throw new Error("Not authenticated");
  }

  return {
    id: session.user_id,
    email: session.email,
    role: session.role,
    company_id: session.company_id,
  };
}

async function ensureApprovalTables(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID,
      quote_id UUID,
      type TEXT NOT NULL DEFAULT 'quote_approval',
      severity TEXT NOT NULL DEFAULT 'warning',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS quote_id UUID,
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'quote_approval',
    ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'warning',
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP;
  `;

  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS alerts_company_id_idx
    ON alerts(company_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS alerts_event_id_idx
    ON alerts(event_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS alerts_quote_id_idx
    ON alerts(quote_id);
  `;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: "Request approval API route is working.",
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureApprovalTables();

    const body = (await request.json()) as RequestApprovalBody;

    const safeCompanyId = currentUser.company_id; // CHANGED
    const safeQuoteId = typeof body.quoteId === "string" ? body.quoteId : ""; // CHANGED
    const safeEventId = typeof body.eventId === "string" ? body.eventId : ""; // CHANGED

    if (!safeQuoteId) {
      return NextResponse.json(
        {
          success: false,
          error: "quoteId is required",
        },
        { status: 400 },
      );
    }

    if (!safeEventId) {
      return NextResponse.json(
        {
          success: false,
          error: "eventId is required",
        },
        { status: 400 },
      );
    }

    const foodCostPercent = Number(body.foodCostPercent ?? 0);
    const marginPercent = Number(body.marginPercent ?? 0);
    const total = Number(body.total ?? 0);
    const grossProfit = Number(body.grossProfit ?? 0);

    const metadata: ApprovalAlertMetadata = {
      foodCostPercent,
      marginPercent,
      total,
      grossProfit,
      approvalRule: "food_cost_over_32_percent",
    };

    const quoteRows = await sql`
      SELECT id, event_id
      FROM quotes
      WHERE id::text = ${safeQuoteId}
      AND event_id::text = ${safeEventId}
      AND company_id::text = ${safeCompanyId}
      LIMIT 1;
    `;

    if (quoteRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 },
      );
    }

    const result = await sql.begin(async (tx) => {
      const existingAlerts = await tx`
        SELECT id, title, message, status, created_at
        FROM alerts
        WHERE company_id::text = ${safeCompanyId}
        AND quote_id::text = ${safeQuoteId}
        AND type = 'quote_approval'
        AND status = 'open'
        ORDER BY created_at DESC
        LIMIT 1;
      `;

      const alertRows =
        existingAlerts.length > 0
          ? existingAlerts
          : await tx`
              INSERT INTO alerts (
                company_id,
                event_id,
                quote_id,
                type,
                severity,
                title,
                message,
                status,
                metadata
              )
              VALUES (
                ${safeCompanyId},
                ${safeEventId},
                ${safeQuoteId},
                'quote_approval',
                'warning',
                'Quote approval required',
                ${`Food cost is ${foodCostPercent.toFixed(2)}%. Target is 32% or lower before sending this quote.`},
                'open',
                ${sql.json(metadata)}
              )
              RETURNING id, title, message, status, created_at;
            `;

      const quoteUpdateRows = await tx`
        UPDATE quotes
        SET
          approval_status = 'approval_required',
          approval_requested_at = COALESCE(approval_requested_at, NOW())
        WHERE id::text = ${safeQuoteId}
        AND company_id::text = ${safeCompanyId}
        RETURNING id, approval_status, approval_requested_at;
      `;

      const eventUpdateRows = await tx`
        UPDATE events
        SET approval_status = 'approval_required'
        WHERE id::text = ${safeEventId}
        AND company_id::text = ${safeCompanyId}
        RETURNING id, approval_status;
      `;

      return {
        alert: alertRows[0],
        quote: quoteUpdateRows[0],
        event: eventUpdateRows[0] ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Approval request created.",
      data: result,
    });
  } catch (error: unknown) {
    console.error("POST /api/quotes/request-approval error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getStatusCode(error) },
    );
  }
}