import { NextResponse } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        latest_cost NUMERIC DEFAULT 0,
        unit TEXT DEFAULT 'lb',
        company_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_name TEXT,
        invoice_number TEXT,
        invoice_date DATE,
        invoice_total NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'review',
        company_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID,
        ingredient_id UUID,
        item_name TEXT,
        quantity NUMERIC DEFAULT 0,
        unit TEXT DEFAULT 'lb',
        unit_price NUMERIC DEFAULT 0,
        total_price NUMERIC DEFAULT 0,
        company_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ingredient_id UUID,
        old_cost NUMERIC DEFAULT 0,
        new_cost NUMERIC DEFAULT 0,
        change_amount NUMERIC DEFAULT 0,
        change_percent NUMERIC DEFAULT 0,
        company_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        ingredient_id UUID,
        title TEXT,
        message TEXT,
        alert_type TEXT DEFAULT 'price_increase',
        severity TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'new',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE alerts
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS ingredient_id UUID,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS message TEXT,
      ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'price_increase',
      ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS event_cost_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name TEXT,
        ingredient_id UUID,
        quantity NUMERIC DEFAULT 0,
        cost_per_unit NUMERIC DEFAULT 0,
        total_cost NUMERIC DEFAULT 0,
        company_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS recipes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        selling_price NUMERIC DEFAULT 0,
        portions NUMERIC DEFAULT 1,
        company_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipe_id UUID,
        ingredient_id UUID,
        quantity NUMERIC DEFAULT 0,
        unit TEXT DEFAULT 'lb',
        company_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS event_recipe_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name TEXT,
        recipe_id UUID,
        servings NUMERIC DEFAULT 0,
        total_cost NUMERIC DEFAULT 0,
        company_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    return NextResponse.json({
      ok: true,
      message: "All tables created/updated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}