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

type AlertRow = {
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

  return "Unknown alerts API error";
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

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

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
      ORDER BY alerts.created_at DESC
      LIMIT 10;
    `;

   const alerts = rows.map((alertRow) => { 
  const alert = alertRow as unknown as AlertRow; 

  return { 
    id: alert.id, 
    title: alert.title ?? "Ingredient cost alert", 
    message: alert.message ?? "Review ingredient cost change.", 
    type: alert.alert_type ?? "price_increase", 
    severity: alert.severity ?? "medium", 
    status: alert.status ?? "new", 
    ingredientName: alert.ingredient_name, 
    oldCost: Number(alert.old_cost ?? 0), 
    newCost: Number(alert.new_cost ?? 0),
    changePercent: Number(alert.change_percent ?? 0), 
    createdAt: alert.created_at, 
  }; 
}); 
    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error: unknown) {
    console.error("GET /api/alerts error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}