import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    await sql`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `;

    await sql`
      ALTER TABLE ingredients
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'lb',
      ADD COLUMN IF NOT EXISTS latest_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS vendor_name TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    await sql`
      ALTER TABLE invoices
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS vendor_name TEXT,
      ADD COLUMN IF NOT EXISTS invoice_number TEXT,
      ADD COLUMN IF NOT EXISTS invoice_date DATE,
      ADD COLUMN IF NOT EXISTS invoice_total NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'review',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    await sql`
      ALTER TABLE invoice_lines
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS invoice_id UUID,
      ADD COLUMN IF NOT EXISTS ingredient_id UUID,
      ADD COLUMN IF NOT EXISTS item_name TEXT,
      ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'lb',
      ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_total NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    await sql`
      ALTER TABLE price_history
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS ingredient_id UUID,
      ADD COLUMN IF NOT EXISTS old_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS new_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS change_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS change_percent NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'invoice',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    await sql`
      ALTER TABLE alerts
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS ingredient_id UUID,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS message TEXT,
      ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'price_change',
      ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    return NextResponse.json({
      success: true,
      message: "Core columns fixed. Missing vendor_name column added.",
    });
  } catch (error: any) {
    console.error("fix-core-columns error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}