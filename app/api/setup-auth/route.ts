import { NextResponse } from "next/server";
import postgres from "postgres";
import { hashPassword } from "../../lib/server-auth";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    // Needed for gen_random_uuid()
    await sql`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
    `;

    // Create companies table if missing
    await sql`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Add missing company columns safely
    await sql`
      ALTER TABLE companies
      ADD COLUMN IF NOT EXISTS company_code TEXT,
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
      ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
      ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP;
    `;

    // Create users table if missing
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        role TEXT DEFAULT 'OWNER',
        company_id UUID,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Add missing user columns safely
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'OWNER',
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
    `;

    const ownerPassword = String(process.env.INITIAL_OWNER_PASSWORD || "").trim();
    const ownerPasswordHash = ownerPassword.length >= 8 ? hashPassword(ownerPassword) : null;

    // Check if owner already exists
    const existingUser = await sql`
      SELECT id, email, role, company_id
      FROM users
      WHERE email = 'owner@ibirdos.com'
      LIMIT 1;
    `;

    if (existingUser.length > 0 && existingUser[0].company_id) {
  const updatedUser = ownerPasswordHash
    ? await sql`
        UPDATE users
        SET password_hash = ${ownerPasswordHash}, role = 'OWNER'
        WHERE email = 'owner@ibirdos.com'
        RETURNING id, email, role, company_id;
      `
    : existingUser; // CHANGED

  return NextResponse.json({
    success: true,
    message: "Auth already set up and password refreshed", // CHANGED
    user: updatedUser[0], // CHANGED
  });
}

    // Find existing company or create one
    let companyRows = await sql`
      SELECT id, name, company_code
      FROM companies
      WHERE company_code = 'IBIRDOS-001'
      LIMIT 1;
    `;

    if (companyRows.length === 0) {
      companyRows = await sql`
        INSERT INTO companies (name, company_code)
        VALUES ('iBirdOS Test Company', 'IBIRDOS-001')
        RETURNING id, name, company_code;
      `;
    }

    const company = companyRows[0];

    // If user exists but missing company_id, fix it
    if (existingUser.length > 0 && !existingUser[0].company_id) {
      const fixedUser = await sql`
        UPDATE users
        SET company_id = ${company.id}, role = 'OWNER'
        WHERE email = 'owner@ibirdos.com'
        RETURNING id, email, role, company_id;
      `;

      return NextResponse.json({
        success: true,
        message: "Existing user fixed with company_id",
        company,
        user: fixedUser[0],
      });
    }

    // Create owner user
    const userRows = await sql`
      INSERT INTO users (email, role, company_id, password_hash)
      VALUES ('owner@ibirdos.com', 'OWNER', ${company.id}, ${ownerPasswordHash})
      RETURNING id, email, role, company_id;
    `;

    return NextResponse.json({
      success: true,
      message: "Auth setup complete",
      company,
      user: userRows[0],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}