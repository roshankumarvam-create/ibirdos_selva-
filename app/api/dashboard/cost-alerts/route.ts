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

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

type CostAlertRow = {
  id: string;
  title: string | null;
  message: string | null;
  alert_type: string | null;
  severity: string | null;
  status: string | null;
  ingredient_name: string | null;
  old_cost: string | number | null;
  new_cost: string | number | null;
  change_percent: string | number | null;
  created_at: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown dashboard cost alerts error";
}

async function getCurrentUser(): Promise<CurrentUser> {
  const users = await sql`
    SELECT id, email, role, company_id
    FROM users
    WHERE email = 'owner@ibirdos.com'
    LIMIT 1;
  `;

  const user = users[0] as CurrentUser | undefined;

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.company_id) {
    throw new Error("User missing company_id");
  }

  return user;
}

async function ensureCostAlertTables(): Promise<void> {
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
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    await ensureCostAlertTables();

    const rows = await sql`
      SELECT
        alerts.id,
        alerts.title,
        alerts.message,
        alerts.alert_type,
        alerts.severity,
        alerts.status,
        alerts.created_at,
        ingredients.name AS ingredient_name,
        latest_price.old_cost,
        latest_price.new_cost,
        latest_price.change_percent
      FROM alerts
      LEFT JOIN ingredients
        ON ingredients.id = alerts.ingredient_id
        AND ingredients.company_id::text = ${currentUser.company_id}
      LEFT JOIN LATERAL (
        SELECT
          price_history.old_cost,
          price_history.new_cost,
          price_history.change_percent
        FROM price_history
        WHERE price_history.ingredient_id = alerts.ingredient_id
          AND price_history.company_id::text = ${currentUser.company_id}
        ORDER BY price_history.created_at DESC
        LIMIT 1
      ) AS latest_price ON true
            WHERE alerts.company_id::text = ${currentUser.company_id}
        AND alerts.ingredient_id IS NOT NULL
      ORDER BY alerts.created_at DESC
      LIMIT 10;
    `;
   const alerts = rows.map((alertRow) => { // CHANGED
  const alert = alertRow as unknown as CostAlertRow; // CHANGED

  return { // CHANGED
    id: alert.id, // CHANGED
    title: alert.title ?? "Ingredient cost alert", // CHANGED
    message: alert.message ?? "Review ingredient cost change.", // CHANGED
    type: alert.alert_type ?? "price_increase", // CHANGED
    severity: alert.severity ?? "medium", // CHANGED
    status: alert.status ?? "new", // CHANGED
    ingredientName: alert.ingredient_name, // CHANGED
    oldCost: Number(alert.old_cost ?? 0), // CHANGED
    newCost: Number(alert.new_cost ?? 0), // CHANGED
    changePercent: Number(alert.change_percent ?? 0), // CHANGED
    createdAt: alert.created_at, // CHANGED
  }; // CHANGED
});

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error: unknown) {
    console.error("GET /api/dashboard/cost-alerts error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}