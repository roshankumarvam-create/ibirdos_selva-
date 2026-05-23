import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    const ingredientName = "Chicken Breast";
    const oldCost = 3.25;
    const newCost = 3.75;

    const changeAmount = newCost - oldCost;
    const changePercent = Number(((changeAmount / oldCost) * 100).toFixed(2));

    const ingredients = await sql`
      SELECT id
      FROM ingredients
      WHERE name = ${ingredientName}
      LIMIT 1;
    `;

    if (ingredients.length === 0) {
      return Response.json({
        ok: false,
        message: "Ingredient not found. Run /api/test-price-history first.",
      });
    }

    const ingredient = ingredients[0];

    const alert = await sql`
      INSERT INTO alerts (
        ingredient_id,
        title,
        message,
        alert_type,
        severity,
        status
      )
      VALUES (
        ${ingredient.id},
        ${`${ingredientName} cost increased ${changePercent}%`},
        ${`${ingredientName} cost changed from $${oldCost} to $${newCost}`},
        'price_increase',
        'high',
        'new'
      )
      RETURNING *;
    `;

    return Response.json({
      ok: true,
      message: "Alert created successfully",
      alert: alert[0],
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}