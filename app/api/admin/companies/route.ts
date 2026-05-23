import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getCurrentUser } from "@/app/lib/currentUser";
import { hashPassword } from "@/app/lib/server-auth";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type AdminCompanyBody = {
  companyName?: string;
  ownerName?: string;
  ownerEmail?: string;
  plan?: string;
  subscriptionStatus?: string;
};

type CompanyRow = {
  id: string;
  name: string;
  plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
};

type UserRow = {
  id: string;
  email: string;
  role: string;
  company_id: string;
  full_name: string | null;
  created_at: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown admin company error";
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isAdminUser(role: string, email: string): boolean {
  return role === "admin" || email === "owner@ibirdos.com";
}

async function ensureAdminCompanySchema(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner',
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_company_id
    ON users(company_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(LOWER(email));
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_companies_plan
    ON companies(plan);
  `;
}

function mapCompany(row: CompanyRow) {
  return {
    id: row.id,
    name: row.name,
    plan: row.plan,
    subscriptionStatus: row.subscription_status,
    trialEndsAt: row.trial_ends_at,
    createdAt: row.created_at,
  };
}

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    companyId: row.company_id,
    fullName: row.full_name,
    createdAt: row.created_at,
  };
}

export async function GET(): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();

    if (!isAdminUser(currentUser.role, currentUser.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 },
      );
    }

    await ensureAdminCompanySchema();

    const rows = await sql`
      SELECT
        id,
        name,
        plan,
        subscription_status,
        trial_ends_at,
        created_at
      FROM companies
      ORDER BY created_at DESC
      LIMIT 50;
    `;

    const companies = (rows as unknown as CompanyRow[]).map(mapCompany);

    return NextResponse.json({
      success: true,
      companies,
      data: companies,
    });
  } catch (error: unknown) {
    console.error("GET admin companies error:", error);

    return NextResponse.json(
      {
        success: false,
        companies: [],
        data: [],
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();

    if (!isAdminUser(currentUser.role, currentUser.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Admin access required",
        },
        { status: 403 },
      );
    }

    await ensureAdminCompanySchema();

    const body = (await request.json()) as AdminCompanyBody;

    const companyName = cleanString(body.companyName);
    const ownerName = cleanString(body.ownerName);
    const ownerEmail = normalizeEmail(body.ownerEmail);
    const plan = cleanString(body.plan) || "proof_of_concept";
    const subscriptionStatus = cleanString(body.subscriptionStatus) || "pilot";
    const temporaryPassword = "Welcome123!";
    const passwordHash = hashPassword(temporaryPassword);

    if (!companyName) {
      return NextResponse.json(
        {
          success: false,
          error: "Company name is required",
        },
        { status: 400 },
      );
    }

    if (!ownerEmail || !ownerEmail.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid owner email is required",
        },
        { status: 400 },
      );
    }

    const existingCompanyRows = await sql`
      SELECT
        id,
        name,
        plan,
        subscription_status,
        trial_ends_at,
        created_at
      FROM companies
      WHERE LOWER(name) = LOWER(${companyName})
      LIMIT 1;
    `;

    const companyRows =
      existingCompanyRows.length > 0
        ? await sql`
            UPDATE companies
            SET
              plan = ${plan},
              subscription_status = ${subscriptionStatus},
              updated_at = NOW()
            WHERE id = ${(existingCompanyRows[0] as CompanyRow).id}
            RETURNING
              id,
              name,
              plan,
              subscription_status,
              trial_ends_at,
              created_at;
          `
        : await sql`
            INSERT INTO companies (
              id,
              name,
              plan,
              subscription_status,
              trial_ends_at,
              created_at,
              updated_at
            )
            VALUES (
              gen_random_uuid(),
              ${companyName},
              ${plan},
              ${subscriptionStatus},
              NOW() + INTERVAL '90 days',
              NOW(),
              NOW()
            )
            RETURNING
              id,
              name,
              plan,
              subscription_status,
              trial_ends_at,
              created_at;
          `;

    const company = companyRows[0] as unknown as CompanyRow;

    const existingUserRows = await sql`
      SELECT
        id,
        email,
        role,
        company_id,
        full_name,
        created_at
      FROM users
      WHERE LOWER(email) = LOWER(${ownerEmail})
      LIMIT 1;
    `;

    const userRows =
      existingUserRows.length > 0
        ? await sql`
            UPDATE users
            SET
              full_name = ${ownerName || ownerEmail},
              role = 'owner',
              company_id = ${company.id},
              password_hash = ${passwordHash},
              must_change_password = true,
              updated_at = NOW()
            WHERE id = ${(existingUserRows[0] as UserRow).id}
            RETURNING
              id,
              email,
              role,
              company_id,
              full_name,
              created_at;
          `
        : await sql`
            INSERT INTO users (
              id,
              email,
              full_name,
              role,
              company_id,
              password_hash,
              must_change_password,
              created_at,
              updated_at
            )
            VALUES (
              gen_random_uuid(),
              ${ownerEmail},
              ${ownerName || ownerEmail},
              'owner',
              ${company.id},
              ${passwordHash},
              true,
              NOW(),
              NOW()
            )
            RETURNING
              id,
              email,
              role,
              company_id,
              full_name,
              created_at;
          `;

    const ownerUser = userRows[0] as unknown as UserRow;

    return NextResponse.json({
      success: true,
      company: mapCompany(company),
      ownerUser: mapUser(ownerUser),
      temporaryPassword,
      message: "Pilot company and owner user created",
    });
  } catch (error: unknown) {
    console.error("POST admin companies error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}