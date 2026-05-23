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
      CREATE TABLE IF NOT EXISTS price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        ingredient_id UUID,
        old_cost NUMERIC DEFAULT 0,
        new_cost NUMERIC DEFAULT 0,
        change_amount NUMERIC DEFAULT 0,
        change_percent NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await sql`
      ALTER TABLE price_history
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS ingredient_id UUID,
      ADD COLUMN IF NOT EXISTS old_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS new_cost NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS change_amount NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS change_percent NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID,
        ingredient_id UUID,
        title TEXT,
        message TEXT,
        type TEXT DEFAULT 'price_increase',
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
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
      ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    const ingredientRows = await sql`
      SELECT id, name, latest_cost, unit, company_id
      FROM ingredients
      WHERE name = 'Chicken Breast'
      AND company_id = ${currentUser.company_id}
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const ingredient = ingredientRows[0];

    if (!ingredient) {
      return NextResponse.json(
        {
          success: false,
          error: "Chicken Breast not found. Run /api/test-ingredient first.",
        },
        { status: 404 }
      );
    }

    const oldCost = Number(ingredient.latest_cost);
    const newCost = 3.75;
    const changeAmount = Number((newCost - oldCost).toFixed(2));
    const changePercent =
      oldCost > 0 ? Number(((changeAmount / oldCost) * 100).toFixed(2)) : 0;

    await sql`
      UPDATE ingredients
      SET latest_cost = ${newCost}
      WHERE id = ${ingredient.id}
      AND company_id = ${currentUser.company_id};
    `;

    const priceHistoryRows = await sql`
      INSERT INTO price_history (
        company_id,
        ingredient_id,
        old_cost,
        new_cost,
        change_amount,
        change_percent
      )
      VALUES (
        ${currentUser.company_id},
        ${ingredient.id},
        ${oldCost},
        ${newCost},
        ${changeAmount},
        ${changePercent}
      )
      RETURNING *;
    `;

    let alert = null;

    if (changeAmount > 0) {
      const alertRows = await sql`
        INSERT INTO alerts (
          company_id,
          ingredient_id,
          title,
          message,
          type,
          status,
          severity
        )
        VALUES (
          ${currentUser.company_id},
          ${ingredient.id},
          'Chicken Breast cost increased',
          ${`Chicken Breast increased from $${oldCost.toFixed(2)}/lb to $${newCost.toFixed(2)}/lb. Change: ${changePercent}%.`},
          'price_increase',
          'new',
          'high'
        )
        RETURNING *;
      `;

      alert = alertRows[0];
    }

    return NextResponse.json({
      success: true,
      message: "Ingredient → PriceHistory → Alert engine working",
      company_id: currentUser.company_id,
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        old_cost: oldCost,
        new_cost: newCost,
        unit: ingredient.unit,
      },
      price_history: priceHistoryRows[0],
      alert,
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