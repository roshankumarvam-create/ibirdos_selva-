import { NextResponse } from "next/server";
import postgres from "postgres";

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

  if (!user) throw new Error("User not found");
  if (!user.company_id) throw new Error("User missing company_id");

  return user;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        ingredient_id UUID,
        title TEXT NOT NULL,
        message TEXT,
        type TEXT DEFAULT 'price_increase',
        alert_type TEXT DEFAULT 'price_change',
        status TEXT DEFAULT 'new',
        severity TEXT DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE alerts
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS ingredient_id UUID,
      ADD COLUMN IF NOT EXISTS title TEXT,
      ADD COLUMN IF NOT EXISTS message TEXT,
      ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'price_increase',
      ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'price_change',
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    const alerts = await sql`
      SELECT
        id,
        company_id,
        ingredient_id,
        title,
        message,
        type,
        alert_type,
        status,
        severity,
        created_at
      FROM alerts
      WHERE company_id = ${currentUser.company_id}
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    return NextResponse.json({
      success: true,
      message: "Latest alerts loaded",
      company_id: currentUser.company_id,

      // keep both so nothing breaks
      data: alerts,
      alerts: alerts,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}