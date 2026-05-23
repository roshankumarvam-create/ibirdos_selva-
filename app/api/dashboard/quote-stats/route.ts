import { NextResponse } from "next/server";
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

type QuoteStatsRow = {
  total_quotes: number;
  approval_required_quotes: number;
  approved_ready_to_send_quotes: number;
  sent_quotes: number;
  draft_quotes: number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown dashboard quote stats error";
}

async function ensureQuoteStatsColumns(): Promise<void> {
  await sql`
    ALTER TABLE quotes
    ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
  `;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    await ensureQuoteStatsColumns();

    const rows = await sql`
      SELECT
        COUNT(*)::int AS total_quotes,

        COUNT(*) FILTER (
          WHERE approval_status IN ('approval_required', 'approval_requested')
          AND sent_at IS NULL
        )::int AS approval_required_quotes,

        COUNT(*) FILTER (
          WHERE approval_status = 'approved'
          AND sent_at IS NULL
        )::int AS approved_ready_to_send_quotes,

        COUNT(*) FILTER (
          WHERE sent_at IS NOT NULL
        )::int AS sent_quotes,

        COUNT(*) FILTER (
          WHERE COALESCE(approval_status, 'draft') = 'draft'
          AND sent_at IS NULL
        )::int AS draft_quotes
      FROM quotes
      WHERE company_id::text = ${currentUser.company_id};
    `;

    const stats = rows[0] as QuoteStatsRow | undefined;

    return NextResponse.json({
      success: true,
      data: {
        totalQuotes: Number(stats?.total_quotes ?? 0),
        approvalRequiredQuotes: Number(stats?.approval_required_quotes ?? 0),
        approvedReadyToSendQuotes: Number(
          stats?.approved_ready_to_send_quotes ?? 0
        ),
        sentQuotes: Number(stats?.sent_quotes ?? 0),
        draftQuotes: Number(stats?.draft_quotes ?? 0),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/dashboard/quote-stats error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}