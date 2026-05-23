import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "../../../lib/server-auth";

export const dynamic = "force-dynamic";

type CompanyBillingRow = {
  id: string;
  name: string;
  plan: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown billing status error";
}

export async function GET(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return NextResponse.json(
        { success: false, error: "DATABASE_URL is missing" },
        { status: 500 }
      );
    }

    const session = getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Not logged in" },
        { status: 401 }
      );
    }

    const sql = postgres(databaseUrl, {
      ssl: databaseUrl.includes("localhost") ? false : "require",
    });

    const rows = await sql`
      SELECT
        id,
        name,
        plan,
        subscription_status,
        stripe_customer_id,
        stripe_subscription_id,
        current_period_end
      FROM companies
      WHERE id::text = ${session.company_id}
      LIMIT 1;
    `;

    await sql.end();

    const company = rows[0] as CompanyBillingRow | undefined;

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      company,
    });
  } catch (error: unknown) {
    console.error("GET /api/billing/status error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}