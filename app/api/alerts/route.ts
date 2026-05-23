import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "../../lib/server-auth";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type AlertRow = {
  id: string;
  company_id: string;
  title: string | null;
  message: string | null;
  alert_type: string | null;
  severity: string | null;
  status: string | null;
  ingredient_id: string | null;
  ingredient_name: string | null;
  old_cost: string | number | null;
  new_cost: string | number | null;
  change_percent: string | number | null;
  invoice_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AlertResponse = {
  id: string;
  companyId: string;
  title: string;
  message: string;
  alertType: string;
  severity: string;
  status: string;
  ingredientId: string;
  ingredientName: string;
  oldCost: number;
  newCost: number;
  changePercent: number;
  invoiceId: string;
  createdAt: string;
  updatedAt: string;
};

type AlertsApiResponse = {
  success: boolean;
  companyId?: string;
  alerts: AlertResponse[];
  error?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Failed to load alerts";
}

function toNumber(value: string | number | null): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatAlert(row: AlertRow): AlertResponse {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title ?? "Cost alert",
    message: row.message ?? "",
    alertType: row.alert_type ?? "cost_alert",
    severity: row.severity ?? "info",
    status: row.status ?? "open",
    ingredientId: row.ingredient_id ?? "",
    ingredientName: row.ingredient_name ?? "Unknown ingredient",
    oldCost: toNumber(row.old_cost),
    newCost: toNumber(row.new_cost),
    changePercent: toNumber(row.change_percent),
    invoiceId: row.invoice_id ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AlertsApiResponse>> {
  try {
    const session = getSessionFromRequest(request);

    if (!session?.company_id) {
      return NextResponse.json(
        {
          success: false,
          alerts: [],
          error: "Unauthorized: missing company_id",
        },
        { status: 401 },
      );
    }

    const alerts = await sql<AlertRow[]>`
      SELECT
        id,
        company_id,
        title,
        message,
        alert_type,
        severity,
        status,
        ingredient_id,
        ingredient_name,
        old_cost,
        new_cost,
        change_percent,
        invoice_id,
        created_at,
        updated_at
      FROM alerts
      WHERE company_id = ${session.company_id}
      ORDER BY created_at DESC
      LIMIT 25
    `;

    return NextResponse.json({
      success: true,
      companyId: session.company_id,
      alerts: alerts.map(formatAlert),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        alerts: [],
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}