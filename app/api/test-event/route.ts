import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    let [ingredient] = await sql`
      SELECT * FROM ingredients
      WHERE name = 'Chicken Breast'
      LIMIT 1;
    `;

    const [eventLine] = await sql`
      INSERT INTO event_cost_lines (
        event_name,
        ingredient_id,
        quantity,
        cost_per_unit,
        total_cost
      )
      VALUES (
        'Thursday Catering',
        ${ingredient.id},
        20,
        ${ingredient.latest_cost},
        ${ingredient.latest_cost * 20}
      )
      RETURNING *;
    `;

    return Response.json({
      ok: true,
      eventLine,
    });
  } catch (error: any) {
    return Response.json({ ok: false, error: error.message });
  }
}