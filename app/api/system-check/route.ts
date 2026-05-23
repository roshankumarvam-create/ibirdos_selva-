import { NextResponse } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    const alerts = await sql`
      SELECT * FROM alerts
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    const events = await sql`
      SELECT * FROM event_recipe_lines
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    const recipes = await sql`
      SELECT * FROM recipes
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    const ingredients = await sql`
      SELECT * FROM ingredients
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    return NextResponse.json({
      ok: true,
      counts: {
        alerts: alerts.length,
        events: events.length,
        recipes: recipes.length,
        ingredients: ingredients.length,
      },
      alerts,
      events,
      recipes,
      ingredients,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }
}