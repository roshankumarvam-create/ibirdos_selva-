import { NextResponse } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    const eventRecipes = await sql`
      SELECT 
        e.event_name,
        r.name as recipe_name,
        e.servings,
        r.selling_price,
        r.portions,
        r.id as recipe_id
      FROM event_recipe_lines e
      JOIN recipes r ON e.recipe_id = r.id
    `;

    const results: any[] = [];

    for (const row of eventRecipes) {
      const ingredients = await sql`
        SELECT 
          ri.quantity,
          i.latest_cost
        FROM recipe_ingredients ri
        JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ${row.recipe_id}
      `;

      let recipeBatchCost = 0;

      for (const ing of ingredients) {
        recipeBatchCost += Number(ing.quantity) * Number(ing.latest_cost);
      }

      const recipePortions = Number(row.portions) || 1;
      const eventServings = Number(row.servings) || 0;
      const sellingPrice = Number(row.selling_price) || 0;

      const costPerServing = recipeBatchCost / recipePortions;
      const totalCost = costPerServing * eventServings;
      const revenue = eventServings * sellingPrice;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      results.push({
        event_name: row.event_name,
        recipe: row.recipe_name,
        servings: eventServings,
        revenue: Number(revenue.toFixed(2)),
        recipe_batch_cost: Number(recipeBatchCost.toFixed(2)),
        cost_per_serving: Number(costPerServing.toFixed(2)),
        total_cost: Number(totalCost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
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