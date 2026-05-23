import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type CurrentSession = {
  id?: string;
  email?: string;
  role?: string;
  company_id?: string;
};

type SalesLineInput = {
  name?: string;
  category?: string;
  amount?: number;
  count?: number;
};

type PaymentLineInput = {
  tenderType?: string;
  amount?: number;
  count?: number;
};

type SalesRequestBody = {
  salesDate?: string;
  locationName?: string;
  shiftName?: string;
  totalSales?: number;
  breakfastSales?: number;
  lunchSales?: number;
  cateringSales?: number;
  barSales?: number;
  thirdPartySales?: number;
  refunds?: number;
  voids?: number;
  discounts?: number;
  posTotal?: number;
  cashDeposit?: number;
  cardTotal?: number;
  giftCardTotal?: number;
  houseAccountTotal?: number;
  laborCost?: number;
  rentCost?: number;
  foodCost?: number;
  notes?: string;
  salesLines?: SalesLineInput[];
  paymentLines?: PaymentLineInput[];
};
type ReviewSalesRequestBody = {
  id?: string;
  reviewNote?: string;
  action?: "review_lock" | "unlock";
};

type DailySalesRow = {
  id: string;
  company_id: string;
  sales_date: string | null;
  location_name: string | null;
  shift_name: string | null;
  total_sales: string | number | null;
  breakfast_sales: string | number | null;
  lunch_sales: string | number | null;
  catering_sales: string | number | null;
  bar_sales: string | number | null;
  third_party_sales: string | number | null;
  refunds: string | number | null;
  voids: string | number | null;
  discounts: string | number | null;
  pos_total: string | number | null;
  cash_deposit: string | number | null;
  card_total: string | number | null;
  gift_card_total: string | number | null;
  house_account_total: string | number | null;
  variance_amount: string | number | null;
  labor_cost: string | number | null;
  rent_cost: string | number | null;
  food_cost: string | number | null;
  lc_vs_sales_percent: string | number | null;
  rent_vs_sales_percent: string | number | null;
  food_cost_percent: string | number | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type SalesLineRow = {
  id: string;
  daily_sales_id: string;
  name: string | null;
  category: string | null;
  amount: string | number | null;
  count: string | number | null;
};

type PaymentLineRow = {
  id: string;
  daily_sales_id: string;
  tender_type: string | null;
  amount: string | number | null;
  count: string | number | null;
};

type SalesSummaryRow = {
  total_sales: string | number | null;
  pos_variance: string | number | null;
  labor_cost: string | number | null;
  rent_cost: string | number | null;
  food_cost: string | number | null;
  third_party_sales: string | number | null;
  bar_sales: string | number | null;
  sales_entry_count: string | number | null;
};

type DailySalesResponse = {
  id: string;
  companyId: string;
  salesDate: string;
  locationName: string;
  shiftName: string;
  totalSales: number;
  breakfastSales: number;
  lunchSales: number;
  cateringSales: number;
  barSales: number;
  thirdPartySales: number;
  refunds: number;
  voids: number;
  discounts: number;
  posTotal: number;
  cashDeposit: number;
  cardTotal: number;
  giftCardTotal: number;
  houseAccountTotal: number;
  varianceAmount: number;
  laborCost: number;
  rentCost: number;
  foodCost: number;
  lcVsSalesPercent: number;
  rentVsSalesPercent: number;
  foodCostPercent: number;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type SalesLineResponse = {
  id: string;
  dailySalesId: string;
  name: string;
  category: string;
  amount: number;
  count: number;
};

type PaymentLineResponse = {
  id: string;
  dailySalesId: string;
  tenderType: string;
  amount: number;
  count: number;
};

type SalesApiResponse = {
  success: boolean;
  companyId?: string;
  summary: {
    salesToday: number;
    posVariance: number;
    laborCost: number;
    rentCost: number;
    foodCost: number;
    lcVsSalesPercent: number;
    rentVsSalesPercent: number;
    salesVsFoodCostPercent: number;
    thirdPartyRevenue: number;
    barRevenue: number;
    salesEntryCount: number;
  };
  dailySales: DailySalesResponse[];
  salesLines: SalesLineResponse[];
  paymentLines: PaymentLineResponse[];
  error?: string;
};

type CreateSalesApiResponse = {
  success: boolean;
  companyId?: string;
  dailySales?: DailySalesResponse;
  salesLines?: SalesLineResponse[];
  paymentLines?: PaymentLineResponse[];
  error?: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Sales API failed";
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%\s]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function percent(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) {
    return 0;
  }

  return Number(((part / whole) * 100).toFixed(2));
}

function cleanText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getSessionCompanyId(request: NextRequest): string {
  const session = getSessionFromRequest(request) as CurrentSession | null;

  if (!session?.company_id) {
    throw new Error("Unauthorized: missing company_id");
  }

  return session.company_id;
}

function formatDailySales(row: DailySalesRow): DailySalesResponse {
  return {
    id: row.id,
    companyId: row.company_id,
    salesDate: row.sales_date ?? "",
    locationName: row.location_name ?? "Main Location",
    shiftName: row.shift_name ?? "Daily",
    totalSales: toNumber(row.total_sales),
    breakfastSales: toNumber(row.breakfast_sales),
    lunchSales: toNumber(row.lunch_sales),
    cateringSales: toNumber(row.catering_sales),
    barSales: toNumber(row.bar_sales),
    thirdPartySales: toNumber(row.third_party_sales),
    refunds: toNumber(row.refunds),
    voids: toNumber(row.voids),
    discounts: toNumber(row.discounts),
    posTotal: toNumber(row.pos_total),
    cashDeposit: toNumber(row.cash_deposit),
    cardTotal: toNumber(row.card_total),
    giftCardTotal: toNumber(row.gift_card_total),
    houseAccountTotal: toNumber(row.house_account_total),
    varianceAmount: toNumber(row.variance_amount),
    laborCost: toNumber(row.labor_cost),
    rentCost: toNumber(row.rent_cost),
    foodCost: toNumber(row.food_cost),
    lcVsSalesPercent: toNumber(row.lc_vs_sales_percent),
    rentVsSalesPercent: toNumber(row.rent_vs_sales_percent),
    foodCostPercent: toNumber(row.food_cost_percent),
    notes: row.notes ?? "",
    status: row.status ?? "draft",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function formatSalesLine(row: SalesLineRow): SalesLineResponse {
  return {
    id: row.id,
    dailySalesId: row.daily_sales_id,
    name: row.name ?? "",
    category: row.category ?? "sales",
    amount: toNumber(row.amount),
    count: toNumber(row.count),
  };
}

function formatPaymentLine(row: PaymentLineRow): PaymentLineResponse {
  return {
    id: row.id,
    dailySalesId: row.daily_sales_id,
    tenderType: row.tender_type ?? "",
    amount: toNumber(row.amount),
    count: toNumber(row.count),
  };
}

function emptySalesResponse(error?: string): SalesApiResponse {
  return {
    success: false,
    dailySales: [],
    salesLines: [],
    paymentLines: [],
    summary: {
      salesToday: 0,
      posVariance: 0,
      laborCost: 0,
      rentCost: 0,
      foodCost: 0,
      lcVsSalesPercent: 0,
      rentVsSalesPercent: 0,
      salesVsFoodCostPercent: 0,
      thirdPartyRevenue: 0,
      barRevenue: 0,
      salesEntryCount: 0,
    },
    error,
  };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<SalesApiResponse>> {
  try {
    const companyId = getSessionCompanyId(request);
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date") ?? todayIsoDate();

    const dailySales = await sql<DailySalesRow[]>`
      SELECT
        id,
        company_id,
        sales_date,
        location_name,
        shift_name,
        total_sales,
        breakfast_sales,
        lunch_sales,
        catering_sales,
        bar_sales,
        third_party_sales,
        refunds,
        voids,
        discounts,
        pos_total,
        cash_deposit,
        card_total,
        gift_card_total,
        house_account_total,
        variance_amount,
        labor_cost,
        rent_cost,
        food_cost,
        lc_vs_sales_percent,
        rent_vs_sales_percent,
        food_cost_percent,
        notes,
        status,
        created_at,
        updated_at
      FROM daily_sales
      WHERE company_id = ${companyId}
      AND sales_date = ${date}
      ORDER BY created_at DESC NULLS LAST
    `;

    const dailySalesIds = dailySales.map((row) => row.id);

    const salesLines =
      dailySalesIds.length > 0
        ? await sql<SalesLineRow[]>`
            SELECT
              id,
              daily_sales_id,
              name,
              category,
              amount,
              count
            FROM daily_sales_lines
            WHERE company_id = ${companyId}
            AND daily_sales_id = ANY(${dailySalesIds}::uuid[])
            ORDER BY created_at ASC NULLS LAST
          `
        : [];

    const paymentLines =
      dailySalesIds.length > 0
        ? await sql<PaymentLineRow[]>`
            SELECT
              id,
              daily_sales_id,
              tender_type,
              amount,
              count
            FROM daily_payment_lines
            WHERE company_id = ${companyId}
            AND daily_sales_id = ANY(${dailySalesIds}::uuid[])
            ORDER BY created_at ASC NULLS LAST
          `
        : [];

    const summaryRows = await sql<SalesSummaryRow[]>`
      SELECT
        COALESCE(SUM(total_sales), 0) AS total_sales,
        COALESCE(SUM(variance_amount), 0) AS pos_variance,
        COALESCE(SUM(labor_cost), 0) AS labor_cost,
        COALESCE(SUM(rent_cost), 0) AS rent_cost,
        COALESCE(SUM(food_cost), 0) AS food_cost,
        COALESCE(SUM(third_party_sales), 0) AS third_party_sales,
        COALESCE(SUM(bar_sales), 0) AS bar_sales,
        COUNT(*) AS sales_entry_count
      FROM daily_sales
      WHERE company_id = ${companyId}
      AND sales_date = ${date}
    `;

    const summary = summaryRows[0];
    const salesToday = toNumber(summary?.total_sales);
    const laborCost = toNumber(summary?.labor_cost);
    const rentCost = toNumber(summary?.rent_cost);
    const foodCost = toNumber(summary?.food_cost);

    return NextResponse.json({
      success: true,
      companyId,
      dailySales: dailySales.map(formatDailySales),
      salesLines: salesLines.map(formatSalesLine),
      paymentLines: paymentLines.map(formatPaymentLine),
      summary: {
        salesToday,
        posVariance: toNumber(summary?.pos_variance),
        laborCost,
        rentCost,
        foodCost,
        lcVsSalesPercent: percent(laborCost, salesToday),
        rentVsSalesPercent: percent(rentCost, salesToday),
        salesVsFoodCostPercent: percent(foodCost, salesToday),
        thirdPartyRevenue: toNumber(summary?.third_party_sales),
        barRevenue: toNumber(summary?.bar_sales),
        salesEntryCount: toNumber(summary?.sales_entry_count),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(emptySalesResponse(getErrorMessage(error)), {
      status: 500,
    });
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<CreateSalesApiResponse>> {
  try {
    const companyId = getSessionCompanyId(request);
    const body = (await request.json()) as SalesRequestBody;

    const salesDate = cleanText(body.salesDate) || todayIsoDate();
    const locationName = cleanText(body.locationName) || "Main Location";
    const shiftName = cleanText(body.shiftName) || "Daily";

    const breakfastSales = roundMoney(toNumber(body.breakfastSales));
    const lunchSales = roundMoney(toNumber(body.lunchSales));
    const cateringSales = roundMoney(toNumber(body.cateringSales));
    const barSales = roundMoney(toNumber(body.barSales));
    const thirdPartySales = roundMoney(toNumber(body.thirdPartySales));
    const refunds = roundMoney(toNumber(body.refunds));
    const voids = roundMoney(toNumber(body.voids));
    const discounts = roundMoney(toNumber(body.discounts));
    const enteredTotalSales = roundMoney(toNumber(body.totalSales));
    const calculatedSales = roundMoney(
      breakfastSales +
        lunchSales +
        cateringSales +
        barSales +
        thirdPartySales -
        refunds -
        voids -
        discounts,
    );
    const totalSales = enteredTotalSales > 0 ? enteredTotalSales : calculatedSales;

    const cashDeposit = roundMoney(toNumber(body.cashDeposit));
    const cardTotal = roundMoney(toNumber(body.cardTotal));
    const giftCardTotal = roundMoney(toNumber(body.giftCardTotal));
    const houseAccountTotal = roundMoney(toNumber(body.houseAccountTotal));
    const enteredPosTotal = roundMoney(toNumber(body.posTotal));
    const calculatedTenderTotal = roundMoney(
      cashDeposit + cardTotal + giftCardTotal + houseAccountTotal,
    );
    const posTotal = enteredPosTotal > 0 ? enteredPosTotal : totalSales;
    const varianceAmount = roundMoney(calculatedTenderTotal - posTotal);

    const laborCost = roundMoney(toNumber(body.laborCost));
    const rentCost = roundMoney(toNumber(body.rentCost));
    const foodCost = roundMoney(toNumber(body.foodCost));

    const insertedSalesRows = await sql<DailySalesRow[]>`
      INSERT INTO daily_sales (
        company_id,
        sales_date,
        location_name,
        shift_name,
        total_sales,
        breakfast_sales,
        lunch_sales,
        catering_sales,
        bar_sales,
        third_party_sales,
        refunds,
        voids,
        discounts,
        pos_total,
        cash_deposit,
        card_total,
        gift_card_total,
        house_account_total,
        variance_amount,
        labor_cost,
        rent_cost,
        food_cost,
        lc_vs_sales_percent,
        rent_vs_sales_percent,
        food_cost_percent,
        notes,
        status,
        created_at,
        updated_at
      )
      VALUES (
        ${companyId},
        ${salesDate},
        ${locationName},
        ${shiftName},
        ${totalSales}::numeric,
        ${breakfastSales}::numeric,
        ${lunchSales}::numeric,
        ${cateringSales}::numeric,
        ${barSales}::numeric,
        ${thirdPartySales}::numeric,
        ${refunds}::numeric,
        ${voids}::numeric,
        ${discounts}::numeric,
        ${posTotal}::numeric,
        ${cashDeposit}::numeric,
        ${cardTotal}::numeric,
        ${giftCardTotal}::numeric,
        ${houseAccountTotal}::numeric,
        ${varianceAmount}::numeric,
        ${laborCost}::numeric,
        ${rentCost}::numeric,
        ${foodCost}::numeric,
        ${percent(laborCost, totalSales)}::numeric,
        ${percent(rentCost, totalSales)}::numeric,
        ${percent(foodCost, totalSales)}::numeric,
        ${cleanText(body.notes)},
        'posted',
        NOW(),
        NOW()
      )
      RETURNING
        id,
        company_id,
        sales_date,
        location_name,
        shift_name,
        total_sales,
        breakfast_sales,
        lunch_sales,
        catering_sales,
        bar_sales,
        third_party_sales,
        refunds,
        voids,
        discounts,
        pos_total,
        cash_deposit,
        card_total,
        gift_card_total,
        house_account_total,
        variance_amount,
        labor_cost,
        rent_cost,
        food_cost,
        lc_vs_sales_percent,
        rent_vs_sales_percent,
        food_cost_percent,
        notes,
        status,
        created_at,
        updated_at
    `;

    const dailySales = insertedSalesRows[0];
    const salesLines: SalesLineRow[] = [];
    const paymentLines: PaymentLineRow[] = [];

    for (const line of body.salesLines ?? []) {
      const insertedLineRows = await sql<SalesLineRow[]>`
        INSERT INTO daily_sales_lines (
          company_id,
          daily_sales_id,
          name,
          category,
          amount,
          count,
          created_at,
          updated_at
        )
        VALUES (
          ${companyId},
          ${dailySales.id},
          ${cleanText(line.name) || "Sales line"},
          ${cleanText(line.category) || "sales"},
          ${roundMoney(toNumber(line.amount))}::numeric,
          ${toNumber(line.count)}::numeric,
          NOW(),
          NOW()
        )
        RETURNING
          id,
          daily_sales_id,
          name,
          category,
          amount,
          count
      `;

      salesLines.push(insertedLineRows[0]);
    }

    for (const line of body.paymentLines ?? []) {
      const insertedPaymentRows = await sql<PaymentLineRow[]>`
        INSERT INTO daily_payment_lines (
          company_id,
          daily_sales_id,
          tender_type,
          amount,
          count,
          created_at,
          updated_at
        )
        VALUES (
          ${companyId},
          ${dailySales.id},
          ${cleanText(line.tenderType) || "Payment"},
          ${roundMoney(toNumber(line.amount))}::numeric,
          ${toNumber(line.count)}::numeric,
          NOW(),
          NOW()
        )
        RETURNING
          id,
          daily_sales_id,
          tender_type,
          amount,
          count
      `;

      paymentLines.push(insertedPaymentRows[0]);
    }

    return NextResponse.json({
      success: true,
      companyId,
      dailySales: formatDailySales(dailySales),
      salesLines: salesLines.map(formatSalesLine),
      paymentLines: paymentLines.map(formatPaymentLine),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
export async function PATCH(
  request: NextRequest,
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const session = getSessionFromRequest(request) as CurrentSession | null;

    if (!session?.company_id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: missing company_id" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as ReviewSalesRequestBody;

    const salesEntryId = cleanText(body.id);
    const reviewNote = cleanText(body.reviewNote);
    const action = body.action ?? "review_lock";

    if (!salesEntryId) {
      return NextResponse.json(
        { success: false, error: "Missing sales entry id." },
        { status: 400 },
      );
    }

    if (action === "unlock") {
      await sql`
        UPDATE daily_sales
        SET
          status = 'posted',
          reviewed_at = NULL,
          reviewed_by = NULL,
          review_note = NULL,
          locked_at = NULL,
          updated_at = NOW()
        WHERE id = ${salesEntryId}
        AND company_id = ${session.company_id}
      `;

      return NextResponse.json({ success: true });
    }

    await sql`
      UPDATE daily_sales
      SET
        status = 'reviewed',
        reviewed_at = NOW(),
        reviewed_by = ${session.email ?? session.id ?? "manager"},
        review_note = ${reviewNote},
        locked_at = NOW(),
        updated_at = NOW()
      WHERE id = ${salesEntryId}
      AND company_id = ${session.company_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}