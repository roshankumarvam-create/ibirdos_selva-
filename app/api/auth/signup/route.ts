import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { hashPassword, createAuthToken } from "../../../lib/server-auth";
import { checkRateLimit, RateLimitError } from "../../../lib/rate-limit";
import { validateRequestBody, isValidEmail } from "../../../lib/validation";

type SignupData = {
  email: string;
  password: string;
  companyName: string;
};

type CompanyRow = {
  id: string;
  name: string;
  company_code: string;
};

type UserRow = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

function getTrialEndDate(): Date {
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 14);
  return trialEndDate;
}

async function ensureSignupColumns(): Promise<void> {
  await sql`
    ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS company_code TEXT,
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial',
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing',
    ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await checkRateLimit(request, {
      interval: 60 * 1000,
      uniqueTokenPerInterval: 3,
    });

    await ensureSignupColumns();

    const body = await request.json();

    const validation = validateRequestBody(body, [
      "email",
      "password",
      "companyName",
    ]);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { success: false, error: validation.errors },
        { status: 400 },
      );
    }

    const { email, password, companyName } = validation.data as SignupData;

    const normalizedEmail = email.trim().toLowerCase();
    const cleanCompanyName = companyName.trim();

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    if (!cleanCompanyName) {
      return NextResponse.json(
        { success: false, error: "Company name is required" },
        { status: 400 },
      );
    }

    const existingUsers = await sql`
      SELECT id
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
      LIMIT 1;
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { success: false, error: "User with this email already exists." },
        { status: 409 },
      );
    }

    const companyCode = `COMP-${Date.now()}`;
    const trialEndsAt = getTrialEndDate();
    const passwordHash = hashPassword(password);

    const result = await sql.begin(async (tx) => {
      const companies = (await tx`
        INSERT INTO companies (
          name,
          company_code,
          plan,
          subscription_status,
          trial_ends_at,
          stripe_customer_id,
          stripe_subscription_id,
          current_period_end
        )
        VALUES (
          ${cleanCompanyName},
          ${companyCode},
          'trial',
          'trialing',
          ${trialEndsAt},
          NULL,
          NULL,
          NULL
        )
        RETURNING id, name, company_code;
      `) as unknown as CompanyRow[];

      const company = companies[0];

      if (!company) {
        throw new Error("Company was not created");
      }

      const users = (await tx`
        INSERT INTO users (
          email,
          password_hash,
          company_id,
          role
        )
        VALUES (
          ${normalizedEmail},
          ${passwordHash},
          ${company.id},
          'owner'
        )
        RETURNING id, email, role, company_id;
      `) as unknown as UserRow[];

      const user = users[0];

      if (!user) {
        throw new Error("User was not created");
      }

      return {
        company,
        user,
      };
    });

    const token = createAuthToken({
      user_id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      company_id: result.user.company_id,
    });

    const response = NextResponse.json({
      success: true,
      ok: true,
      message: "Account created successfully",
      redirect: "/dashboard",
      company: {
        id: result.company.id,
        name: result.company.name,
        company_code: result.company.company_code,
        plan: "trial",
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
      },
    });

    response.cookies.set({
      name: "ibirdos_session",
      value: token,
      httpOnly: true,
      maxAge: 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error: unknown) {
    console.error("Signup error:", error);

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}