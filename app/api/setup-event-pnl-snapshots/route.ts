import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown setup event pnl snapshots error";
}

export async function GET() {
  try {
    await sql`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS event_pnl_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        event_id UUID NOT NULL,

        revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
        food_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
        labor_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
        packaging_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
        delivery_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
        other_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,

        total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
        gross_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
        margin_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,

        menu_items_count INTEGER NOT NULL DEFAULT 0,
        guest_count INTEGER NOT NULL DEFAULT 0,
        snapshot_type TEXT NOT NULL DEFAULT 'current',
        notes TEXT,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS event_pnl_snapshots_company_id_idx
      ON event_pnl_snapshots(company_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS event_pnl_snapshots_event_id_idx
      ON event_pnl_snapshots(event_id);
    `;

    return NextResponse.json({
      success: true,
      message: "event_pnl_snapshots table is ready.",
    });
  } catch (error: unknown) {
    console.error("GET /api/setup-event-pnl-snapshots error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}