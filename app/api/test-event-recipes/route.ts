import { NextResponse } from "next/server";
import postgres from "postgres";
import { getCurrentUser } from "../../lib/currentUser";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    const user = await getCurrentUser();

    let [ingredient] = await sql`
      SELECT *
      FROM ingredients
      WHERE name = 'Chicken Breast'
      AND company_id = ${user.company_id}
      LIMIT 1;
    `;

    if (!ingredient) {
      [ingredient] = await sql`
        INSERT INTO ingredients (name, latest_cost, unit, company_id)
        VALUES ('Chicken Breast', 12, 'lb', ${user.company_id})
        RETURNING *;
      `;
    }

    let [recipe] = await sql`
      SELECT *
      FROM recipes
      WHERE name = 'Chicken Sandwich'
      AND company_id = ${user.company_id}
      LIMIT 1;
    `;

    if (!recipe) {
      [recipe] = await sql`
        INSERT INTO recipes (name, selling_price, portions, company_id)
        VALUES ('Chicken Sandwich', 12, 10, ${user.company_id})
        RETURNING *;
      `;
    }

    await sql`
      DELETE FROM recipe_ingredients
      WHERE recipe_id = ${recipe.id}
      AND company_id = ${user.company_id};
    `;

    await sql`
      INSERT INTO recipe_ingredients (
        recipe_id,
        ingredient_id,
        quantity,
        unit,
        company_id
      )
      VALUES (
        ${recipe.id},
        ${ingredient.id},
        1,
        'lb',
        ${user.company_id}
      );
    `;

    await sql`
      DELETE FROM event_recipe_lines
      WHERE event_name = 'Thursday Catering'
      AND company_id = ${user.company_id};
    `;

    const [eventLine] = await sql`
      INSERT INTO event_recipe_lines (
        event_name,
        recipe_id,
        servings,
        total_cost,
        company_id
      )
      VALUES (
        'Thursday Catering',
        ${recipe.id},
        20,
        0,
        ${user.company_id}
      )
      RETURNING *;
    `;

    return NextResponse.json({
      ok: true,
      message: "Secure test event + recipe linked",
      company_id: user.company_id,
      ingredient,
      recipe,
      eventLine,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
    });
  }
}