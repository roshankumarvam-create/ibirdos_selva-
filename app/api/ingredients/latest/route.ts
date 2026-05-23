import { NextResponse } from "next/server";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

async function getCurrentUser() {
  // MVP temporary user lookup
  // Later this will come from real login/auth
  const email = "owner@ibirdos.com";

  const users = await sql`
    SELECT 
      id,
      email,
      role,
      company_id
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  const user = users[0];

  if (!user) {
    throw new Error("User not found in users table");
  }

  if (!user.company_id) {
    throw new Error("User missing company_id");
  }

  return user;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    const ingredients = await sql`
      SELECT DISTINCT ON (LOWER(name))
        id,
        name,
        latest_cost,
        unit,
        created_at
      FROM ingredients
      WHERE company_id = ${currentUser.company_id}
      ORDER BY LOWER(name), created_at DESC
    `;

    return NextResponse.json({
      success: true,
      data: ingredients,
    });
  } catch (error) {
    console.error("GET /api/ingredients/latest error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load latest prices",
      },
      { status: 500 }
    );
  }
}