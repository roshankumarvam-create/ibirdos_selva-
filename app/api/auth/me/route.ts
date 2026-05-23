import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "../../../lib/server-auth";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type CurrentUserRow = {
  id: string;
  email: string;
  role: string;
  company_id: string;
  company_name: string;
  plan: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
};

function isSubscriptionAllowed(status: string | null): boolean {
  return status === "active" || status === "trialing";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown auth session error";
}

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          subscriptionAllowed: false,
          error: "Not logged in",
        },
        { status: 401 }
      );
    }

    const users = await sql`
      SELECT
        users.id,
        users.email,
        users.role,
        users.company_id,
        companies.name AS company_name,
        companies.plan,
        companies.subscription_status,
        companies.trial_ends_at,
        companies.current_period_end
      FROM users
      INNER JOIN companies
        ON companies.id = users.company_id
      WHERE users.id::text = ${session.user_id}
        AND users.company_id::text = ${session.company_id}
      LIMIT 1;
    `;

    const user = users[0] as CurrentUserRow | undefined;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          subscriptionAllowed: false,
          error: "User not found",
        },
        { status: 401 }
      );
    }

    const subscriptionAllowed = isSubscriptionAllowed(
      user.subscription_status
    );

    if (!subscriptionAllowed) {
      return NextResponse.json(
        {
          success: false,
          authenticated: true,
          subscriptionAllowed: false,
          error: "Company subscription is inactive",
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
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      subscriptionAllowed: true,
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
  } catch (error: unknown) {
    console.error("GET /api/auth/me error:", error);

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        subscriptionAllowed: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}