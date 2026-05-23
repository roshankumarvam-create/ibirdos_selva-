import { NextResponse } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    // Get all event recipe lines
    const eventRecipes = await sql`
      SELECT 
        e.event_name,
        r.name as recipe_name,
        e.servings,
        r.selling_price,
        r.id as recipe_id
      FROM event_recipe_lines e
      JOIN recipes r ON e.recipe_id = r.id
    `;

    let results: any[] = [];

    for (let row of eventRecipes) {
      // Get ingredient cost for recipe
      const ingredients = await sql`
        SELECT 
          ri.quantity,
          i.latest_cost
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ${row.recipe_id}
      `;

      let totalCost = 0;

      for (let ing of ingredients) {
        totalCost += Number(ing.quantity) * Number(ing.latest_cost);
      }

      const revenue = Number(row.servings) * Number(row.selling_price);
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      results.push({
        event_name: row.event_name,
        recipe: row.recipe_name,
        revenue,
        total_cost: totalCost,
        profit,
        margin: Number(margin.toFixed(2)),
      });
    }

    return NextResponse.json({
      ok: true,
      events: results,
    });

  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }
}