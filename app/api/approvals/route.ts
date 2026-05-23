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

type ApprovalAction = "approve" | "reject";

type ApprovalActionBody = {
  quoteId?: string;
  eventId?: string;
  action?: ApprovalAction;
  reason?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown approvals error";
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
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS approval_decision_reason TEXT;
  `;

  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
  `;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureApprovalTables();

    const approvals = await sql`
      SELECT
        id,
        event_id,
        line_items,
        food_cost,
        labor_cost,
        overhead,
        total,
        margin,
        approval_status,
        approval_requested_at,
        created_at
      FROM quotes
      WHERE company_id::text = ${currentUser.company_id}
      AND approval_status IN ('approval_required', 'approval_requested')
      ORDER BY approval_requested_at DESC NULLS LAST, created_at DESC;
    `;

    return NextResponse.json({
      success: true,
      data: approvals,
    });
  } catch (error: unknown) {
    console.error("GET /api/approvals error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: error instanceof Error && error.message === "Not authenticated" ? 401 : 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureApprovalTables();

    const body = (await request.json()) as ApprovalActionBody;

    if (!body.quoteId) {
      return NextResponse.json(
        { success: false, error: "quoteId is required" },
        { status: 400 },
      );
    }

    if (!body.eventId) {
      return NextResponse.json(
        { success: false, error: "eventId is required" },
        { status: 400 },
      );
    }

    if (body.action !== "approve" && body.action !== "reject") {
      return NextResponse.json(
        { success: false, error: "action must be approve or reject" },
        { status: 400 },
      );
    }

    const safeApprovalStatus = body.action === "approve" ? "approved" : "rejected";
    const safeReason = body.reason ?? "";
    const safeQuoteId = body.quoteId;
    const safeEventId = body.eventId;
    const safeCompanyId = currentUser.company_id;

    const result = await sql.begin(async (tx) => {
      const quoteRows = await tx`
        UPDATE quotes
        SET
          approval_status = ${safeApprovalStatus},
          approval_decided_at = NOW(),
          approval_decision_reason = ${safeReason}
        WHERE id::text = ${safeQuoteId}
        AND event_id::text = ${safeEventId}
        AND company_id::text = ${safeCompanyId}
        RETURNING
          id,
          event_id,
          approval_status,
          approval_decided_at,
          approval_decision_reason;
      `;

      if (!quoteRows[0]) {
        throw new Error("Quote not found");
      }

      const eventRows = await tx`
        UPDATE events
        SET approval_status = ${safeApprovalStatus}
        WHERE id::text = ${safeEventId}
        AND company_id::text = ${safeCompanyId}
        RETURNING id, approval_status;
      `;

      const alertRows = await tx`
        UPDATE alerts
        SET
          status = 'resolved',
          metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json({
            approvalDecision: safeApprovalStatus,
            approvalReason: safeReason,
          })}
        WHERE company_id::text = ${safeCompanyId}
        AND quote_id::text = ${safeQuoteId}
        AND type = 'quote_approval'
        AND status = 'open'
        RETURNING id, title, status;
      `;

      return {
        quote: quoteRows[0],
        event: eventRows[0] ?? null,
        alerts: alertRows,
      };
    });

    return NextResponse.json({
      success: true,
      message: body.action === "approve" ? "Quote approved." : "Quote rejected.",
      data: result,
    });
  } catch (error: unknown) {
    console.error("POST /api/approvals error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: error instanceof Error && error.message === "Not authenticated" ? 401 : 500 },
    );
  }
}