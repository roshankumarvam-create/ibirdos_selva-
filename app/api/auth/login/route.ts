import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import {
  createAuthToken,
  SESSION_COOKIE_NAME_EXPORT,
  validateEmail,
  validatePassword,
  verifyPassword,
} from "../../../lib/server-auth";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type LoginBody = {
  email: string;
  password: string;
};

type LoginUserRow = {
  id: string;
  email: string;
  role: string;
  company_id: string;
  password_hash: string | null;
  company_name: string;
  plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown login error";
}

function isSubscriptionAllowed(status: string | null): boolean {
  return status === "active" || status === "trialing" || status === "pilot";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<LoginBody>;

    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!validateEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid email.",
        },
        { status: 400 },
      );
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters.",
        },
        { status: 400 },
      );
    }

    const users = await sql`
      SELECT
        users.id,
        users.email,
        users.role,
        users.company_id,
        users.password_hash,
        companies.name AS company_name,
        companies.plan,
        companies.subscription_status,
        companies.trial_ends_at,
        companies.current_period_end
      FROM users
      INNER JOIN companies
        ON companies.id = users.company_id
      WHERE LOWER(users.email) = ${email}
      ORDER BY
        CASE WHEN users.password_hash IS NULL THEN 1 ELSE 0 END ASC, -- CHANGED
        users.updated_at DESC NULLS LAST, -- CHANGED
        users.created_at DESC NULLS LAST -- CHANGED
      LIMIT 1;
    `;

    const user = users[0] as LoginUserRow | undefined;

    if (!user || !user.password_hash) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Login is not activated for this user yet. Ask iBirdOS admin to set a password.",
        },
        { status: 401 },
      );
    }

    const passwordOk = verifyPassword(password, user.password_hash);

    if (!passwordOk) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password.",
        },
        { status: 401 },
      );
    }

    if (!isSubscriptionAllowed(user.subscription_status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Subscription inactive. Please update billing.",
          subscriptionStatus: user.subscription_status,
        },
        { status: 403 },
      );
    }

    const token = createAuthToken(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
      },
      60 * 60 * 8,
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
      },
      company: {
        id: user.company_id,
        name: user.company_name,
        plan: user.plan,
        subscriptionStatus: user.subscription_status,
        trialEndsAt: user.trial_ends_at,
        currentPeriodEnd: user.current_period_end,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME_EXPORT,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    response.cookies.set({
      name: "ibirdos_user_email",
      value: user.email,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (error: unknown) {
    console.error("POST /api/auth/login error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}