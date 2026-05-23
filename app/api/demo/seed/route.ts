import { NextRequest, NextResponse } from "next/server";
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

type DemoRecipe = {
  name: string;
  category: string;
  servings: number;
  sellingPrice: number;
  totalFoodCost: number;
  productCost: number;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown demo seed error";
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

async function ensureDemoColumns(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT;
  `;

  await sql`
    ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS recipe_name TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS servings NUMERIC DEFAULT 1,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_food_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS product_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE ingredients
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS ingredient_name TEXT,
    ADD COLUMN IF NOT EXISTS unit TEXT,
    ADD COLUMN IF NOT EXISTS latest_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS name TEXT,
    ADD COLUMN IF NOT EXISTS event_name TEXT,
    ADD COLUMN IF NOT EXISTS guest_count NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS food_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS message TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OPEN',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE event_recipe_lines
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS recipe_id UUID,
    ADD COLUMN IF NOT EXISTS guest_count NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS eater_percentage NUMERIC DEFAULT 100,
    ADD COLUMN IF NOT EXISTS servings NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS customer_portions NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prep_portions NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS portion_size NUMERIC DEFAULT 1,
    ADD COLUMN IF NOT EXISTS portion_unit TEXT DEFAULT 'portion',
    ADD COLUMN IF NOT EXISTS waste_buffer_percent NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS required_food_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS station TEXT DEFAULT 'Unassigned',
    ADD COLUMN IF NOT EXISTS prep_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;
}

export async function GET(_request: NextRequest) {
  try {
    await ensureDemoColumns();

    const currentUser = await getCurrentUser();
    const companyId = currentUser.company_id;

    await sql`
      UPDATE companies
      SET
        name = 'Golden Spoon Catering Demo',
        company_name = 'Golden Spoon Catering Demo'
      WHERE id::text = ${companyId};
    `;

    await sql`
      DELETE FROM event_recipe_lines
      WHERE company_id::text = ${companyId};
    `;

    await sql`
      DELETE FROM alerts
      WHERE company_id::text = ${companyId};
    `;

    await sql`
      DELETE FROM events
      WHERE company_id::text = ${companyId};
    `;

    await sql`
      DELETE FROM recipes
      WHERE company_id::text = ${companyId};
    `;

    const demoRecipes: DemoRecipe[] = [
      {
        name: "Chicken Breast Entree",
        category: "Entree",
        servings: 10,
        sellingPrice: 18,
        totalFoodCost: 38.5,
        productCost: 3.85,
      },
      {
        name: "Mix Veg Manchurian Ball",
        category: "Appetizer",
        servings: 8,
        sellingPrice: 8,
        totalFoodCost: 3.6,
        productCost: 0.45,
      },
      {
        name: "Jeera Rice",
        category: "Side",
        servings: 20,
        sellingPrice: 5,
        totalFoodCost: 18,
        productCost: 0.9,
      },
      {
        name: "Garden Salad",
        category: "Side",
        servings: 25,
        sellingPrice: 6,
        totalFoodCost: 22.5,
        productCost: 0.9,
      },
      {
        name: "Mango Lassi",
        category: "Beverage",
        servings: 20,
        sellingPrice: 4,
        totalFoodCost: 24,
        productCost: 1.2,
      },
    ];

    const insertedRecipes = [];

    for (const recipe of demoRecipes) {
      const rows = await sql`
        INSERT INTO recipes (
          company_id,
          name,
          recipe_name,
          category,
          servings,
          selling_price,
          total_food_cost,
          product_cost,
          created_at,
          updated_at
        )
        VALUES (
          ${companyId},
          ${recipe.name},
          ${recipe.name},
          ${recipe.category},
          ${recipe.servings},
          ${recipe.sellingPrice},
          ${recipe.totalFoodCost},
          ${recipe.productCost},
          NOW(),
          NOW()
        )
        RETURNING id, name, category;
      `;

      insertedRecipes.push(rows[0]);
    }

    const ingredients = [
      ["Chicken Breast", "lb", 3.85],
      ["Mixed Vegetables", "lb", 1.2],
      ["Ginger", "lb", 0.7],
      ["Garlic", "lb", 0.65],
      ["Rice", "lb", 0.9],
      ["Cumin Seeds", "oz", 0.35],
      ["Lettuce", "case", 18],
      ["Cucumber", "case", 14],
      ["Tomato", "case", 22],
      ["Mango Pulp", "can", 4.5],
      ["Yogurt", "qt", 3.25],
      ["Milk", "gal", 4.1],
      ["Cream", "qt", 5.75],
      ["Cilantro", "bunch", 1.25],
      ["Onion", "lb", 0.85],
      ["Oil", "gal", 18],
      ["Salt", "lb", 0.25],
      ["Black Pepper", "lb", 7.5],
      ["Corn Starch", "lb", 1.15],
      ["Soy Sauce", "gal", 12],
    ];

    for (const [name, unit, latestCost] of ingredients) {
      await sql`
        INSERT INTO ingredients (
          company_id,
          name,
          ingredient_name,
          unit,
          latest_cost,
          created_at,
          updated_at
        )
        VALUES (
          ${companyId},
          ${name},
          ${name},
          ${unit},
          ${latestCost},
          NOW(),
          NOW()
        );
      `;
    }

    const eventRows = await sql`
      INSERT INTO events (
      company_id,
      name,
      event_name,
      event_date,
      guest_count,
      revenue,
      food_cost,
      total_cost,
      margin,
      created_at,
      updated_at
    )
     VALUES (
     ${companyId},
     'Corporate Lunch - 150 Guests',
     'Corporate Lunch - 150 Guests',
     current_date + interval '3 days',
     150,
     0,
     0,
     0,
     0,
     NOW(),
     NOW()
    )
      RETURNING id;
    `;

    const eventId = (eventRows[0] as { id: string }).id;

    await sql`
      INSERT INTO alerts (
        company_id,
        title,
        message,
        status,
        created_at,
        updated_at
      )
      VALUES
      (
        ${companyId},
        'Chicken Breast cost changed',
        'Chicken Breast changed from $3.65/lb to $3.85/lb. Review catering event margin.',
        'OPEN',
        NOW(),
        NOW()
      ),
      (
        ${companyId},
        'Chopped Ginger cost increased',
        'Chopped Ginger increased from $0.60 to $0.70. This may affect Mix Veg Manchurian Ball.',
        'OPEN',
        NOW(),
        NOW()
      );
    `;

    return NextResponse.json({
      success: true,
      message: "Clean iBirdOS demo data created.",
      companyId,
      eventId,
      recipesCreated: insertedRecipes.length,
      ingredientsCreated: ingredients.length,
      alertsCreated: 2,
    });
  } catch (error: unknown) {
    console.error("GET /api/demo/seed error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}