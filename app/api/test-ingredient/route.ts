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
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS ingredients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        name TEXT NOT NULL,
        latest_cost NUMERIC DEFAULT 0,
        unit TEXT DEFAULT 'lb',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Clean duplicate test Chicken Breast rows for this company only
    await sql`
      DELETE FROM ingredients
      WHERE name = 'Chicken Breast'
      AND company_id = ${currentUser.company_id};
    `;

    const ingredientRows = await sql`
      INSERT INTO ingredients (
        company_id,
        name,
        latest_cost,
        unit
      )
      VALUES (
        ${currentUser.company_id},
        'Chicken Breast',
        3.25,
        'lb'
      )
      RETURNING id, name, latest_cost, unit, company_id;
    `;

    return NextResponse.json({
      success: true,
      message: "Test ingredient reset to 3.25",
      ingredient: ingredientRows[0],
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