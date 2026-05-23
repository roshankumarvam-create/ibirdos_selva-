import { NextResponse } from "next/server";
import postgres from "postgres";
import { hashPassword } from "../../lib/server-auth";

export const dynamic = "force-dynamic";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

export async function GET() {
  try {
    const result = await sql.begin(async (tx) => {
      await tx`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
      `;

      // DEV CLEANUP ONLY:
      // This removes broken old auth/company tables with bad company_id values like "11" or "12".
      await tx`
        DROP TABLE IF EXISTS users CASCADE;
      `;

      await tx`
        DROP TABLE IF EXISTS companies CASCADE;
      `;

      await tx`
        CREATE TABLE companies (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          company_code TEXT UNIQUE,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          plan TEXT DEFAULT 'trial',
          subscription_status TEXT DEFAULT 'trialing',
          trial_ends_at TIMESTAMP,
          current_period_end TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      await tx`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          role TEXT DEFAULT 'OWNER',
          company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          password_hash TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      const companies = await tx`
        INSERT INTO companies (
          name,
          company_code,
          plan,
          subscription_status
        )
        VALUES (
          'iBirdOS Test Company',
          'IBIRDOS',
          'trial',
          'trialing'
        )
        RETURNING id, name, company_code;
      `;

      const company = companies[0];

      const ownerPassword = String(process.env.INITIAL_OWNER_PASSWORD || "").trim();
      const ownerPasswordHash = ownerPassword.length >= 8 ? hashPassword(ownerPassword) : null;

      const users = await tx`
        INSERT INTO users (
          email,
          role,
          company_id,
          password_hash
        )
        VALUES (
          'owner@ibirdos.com',
          'OWNER',
          ${company.id},
          ${ownerPasswordHash}
        )
        RETURNING id, email, role, company_id;
      `;

      return {
        company,
        user: users[0],
      };
    });

    return NextResponse.json({
      ok: true,
      message: "Auth reset complete. Real UUID company_id created.",
      ...result,
    });
  } catch (error: any) {
    console.error("reset-auth error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}