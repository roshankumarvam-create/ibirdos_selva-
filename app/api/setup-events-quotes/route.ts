import { NextResponse } from "next/server";
import postgres from "postgres";

export const dynamic = "force-dynamic";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

async function getCurrentUser() {
  const users = await sql`
    SELECT id, email, role, company_id
    FROM users
    WHERE email = 'owner@ibirdos.com'
    LIMIT 1;
  `;

  const user = users[0];

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.company_id) {
    throw new Error("User missing company_id");
  }

  return user;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    await sql`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `;

    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'event_status'
        ) THEN
          CREATE TYPE event_status AS ENUM (
            'DRAFT',
            'QUOTED',
            'CONFIRMED',
            'COMPLETED'
          );
        END IF;
      END
      $$;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        name TEXT NOT NULL,
        event_date DATE NOT NULL,
        guest_count INTEGER NOT NULL DEFAULT 0,
        status event_status NOT NULL DEFAULT 'DRAFT',
        menu_id UUID,
        service_type TEXT,
        total_cost NUMERIC NOT NULL DEFAULT 0,
        margin NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        event_id UUID NOT NULL,
        line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
        food_cost NUMERIC NOT NULL DEFAULT 0,
        labor_cost NUMERIC NOT NULL DEFAULT 0,
        overhead NUMERIC NOT NULL DEFAULT 0,
        total NUMERIC NOT NULL DEFAULT 0,
        margin NUMERIC NOT NULL DEFAULT 0,
        pdf TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS event_date DATE,
      ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS menu_id UUID,
      ADD COLUMN IF NOT EXISTS service_type TEXT,
      ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    await sql`
      ALTER TABLE quotes
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS event_id UUID,
      ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS food_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS labor_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS overhead NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pdf TEXT,
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS events_company_id_idx
      ON events(company_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS quotes_company_id_idx
      ON quotes(company_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS quotes_event_id_idx
      ON quotes(event_id);
    `;

    return NextResponse.json({
      success: true,
      message: "Events and quotes tables are ready.",
      company_id: currentUser.company_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown setup error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}