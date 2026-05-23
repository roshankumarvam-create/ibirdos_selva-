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

type SendQuoteBody = {
  quoteId?: string;
  eventId?: string;
};

type QuoteRow = {
  id: string;
  event_id: string;
  approval_status: string | null;
  sent_at: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown send quote error";
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

async function ensureSendQuoteColumns(): Promise<void> {
  await sql`
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
  `;

  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
  `;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: "Send quote API route is working.",
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser(request);
    await ensureSendQuoteColumns();

    const body = (await request.json()) as SendQuoteBody;

    const safeQuoteId = typeof body.quoteId === "string" ? body.quoteId : "";
    const safeEventId = typeof body.eventId === "string" ? body.eventId : "";
    const safeCompanyId = currentUser.company_id;

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

    const quoteRows = (await sql`
      SELECT
        id,
        event_id,
        approval_status,
        sent_at
      FROM quotes
      WHERE id::text = ${safeQuoteId}
      AND event_id::text = ${safeEventId}
      AND company_id::text = ${safeCompanyId}
      LIMIT 1;
    `) as unknown as QuoteRow[];

    const quote = quoteRows[0];

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote not found",
        },
        { status: 404 },
      );
    }

    if (quote.approval_status === "rejected") {
      return NextResponse.json(
        {
          success: false,
          error: "Rejected quotes cannot be sent.",
        },
        { status: 403 },
      );
    }

    if (
      quote.approval_status === "approval_required" ||
      quote.approval_status === "approval_requested"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Quote must be approved before sending.",
        },
        { status: 403 },
      );
    }

    const result = await sql.begin(async (tx) => {
      const sentQuoteRows = await tx`
        UPDATE quotes
        SET sent_at = COALESCE(sent_at, NOW())
        WHERE id::text = ${safeQuoteId}
        AND event_id::text = ${safeEventId}
        AND company_id::text = ${safeCompanyId}
        RETURNING
          id,
          event_id,
          sent_at,
          approval_status;
      `;

      const eventRows = await tx`
        UPDATE events
        SET status = 'QUOTED'
        WHERE id::text = ${safeEventId}
        AND company_id::text = ${safeCompanyId}
        RETURNING id, status, approval_status;
      `;

      return {
        quote: sentQuoteRows[0] ?? null,
        event: eventRows[0] ?? null,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Quote sent.",
      data: result,
    });
  } catch (error: unknown) {
    console.error("POST /api/quotes/send error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getStatusCode(error) },
    );
  }
}