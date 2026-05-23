import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getCurrentUser } from "@/app/lib/currentUser";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type EventRow = {
  id: string;
  company_id: string;
  name: string | null;
  event_name: string | null;
  event_date: string | null;
  guest_count: string | number | null;
  status: string | null;
  service_type: string | null;
  total_cost: string | number | null;
  revenue: string | number | null;
  food_cost: string | number | null;
  margin: string | number | null;
  created_at: string | null;
  updated_at: string | null;
};

type EventRecipeLineRow = {
  id: string;
  event_id: string;
  recipe_id: string | null;
  recipe_name: string | null;
  category: string | null;
  customer_portions: string | number | null;
  prep_portions: string | number | null;
  portion_size: string | number | null;
  portion_unit: string | null;
  waste_buffer_percent: string | number | null;
  required_food_amount: string | number | null;
  total_cost: string | number | null;
  selling_price: string | number | null;
  station: string | null;
  prep_status: string | null;
};

type StaffConfirmationRow = {
  id: string;
  event_recipe_line_id: string | null;
  staff_name: string | null;
  station: string | null;
  confirmation_type: string | null;
  status: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type StaffSummaryRow = {
  total: string | number | null;
  pending: string | number | null;
  confirmed: string | number | null;
  needs_help: string | number | null;
  blocked: string | number | null;
};

type ProfitSnapshotRow = {
  id: string;
  revenue: string | number | null;
  food_cost: string | number | null;
  labor_cost: string | number | null;
  packaging_cost: string | number | null;
  delivery_cost: string | number | null;
  other_cost: string | number | null;
  total_cost: string | number | null;
  gross_profit: string | number | null;
  margin_percent: string | number | null;
  menu_items_count: string | number | null;
  guest_count: string | number | null;
  snapshot_type: string | null;
  notes: string | null;
  created_at: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown kitchen packet API error";
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function mapEvent(row: EventRow) {
  return {
    id: row.id,
    company_id: row.company_id,
    companyId: row.company_id,
    name: row.name ?? row.event_name ?? "Untitled Event",
    eventName: row.event_name ?? row.name ?? "Untitled Event",
    event_name: row.event_name ?? row.name ?? "Untitled Event",
    event_date: row.event_date,
    eventDate: row.event_date,
    guest_count: toNumber(row.guest_count),
    guestCount: toNumber(row.guest_count),
    status: row.status ?? "DRAFT",
    service_type: row.service_type,
    serviceType: row.service_type,
    total_cost: toNumber(row.total_cost),
    totalCost: toNumber(row.total_cost),
    revenue: toNumber(row.revenue),
    food_cost: toNumber(row.food_cost),
    foodCost: toNumber(row.food_cost),
    margin: toNumber(row.margin),
    created_at: row.created_at,
    createdAt: row.created_at,
    updated_at: row.updated_at,
    updatedAt: row.updated_at,
  };
}

function mapRecipeLine(row: EventRecipeLineRow) {
  return {
    id: row.id,
    eventId: row.event_id,
    event_id: row.event_id,
    recipeId: row.recipe_id,
    recipe_id: row.recipe_id,
    recipeName: row.recipe_name ?? "Unnamed Recipe",
    recipe_name: row.recipe_name ?? "Unnamed Recipe",
    name: row.recipe_name ?? "Unnamed Recipe",
    category: row.category ?? "Uncategorized",
    customerPortions: toNumber(row.customer_portions),
    customer_portions: toNumber(row.customer_portions),
    prepPortions: toNumber(row.prep_portions),
    prep_portions: toNumber(row.prep_portions),
    portionSize: toNumber(row.portion_size),
    portion_size: toNumber(row.portion_size),
    portionUnit: row.portion_unit ?? "portion",
    portion_unit: row.portion_unit ?? "portion",
    wasteBufferPercent: toNumber(row.waste_buffer_percent),
    waste_buffer_percent: toNumber(row.waste_buffer_percent),
    requiredFoodAmount: toNumber(row.required_food_amount),
    required_food_amount: toNumber(row.required_food_amount),
    totalCost: toNumber(row.total_cost),
    total_cost: toNumber(row.total_cost),
    sellingPrice: toNumber(row.selling_price),
    selling_price: toNumber(row.selling_price),
    station: row.station ?? "Unassigned",
    prepStatus: row.prep_status ?? "Not Started",
    prep_status: row.prep_status ?? "Not Started",
  };
}

function mapStaffConfirmation(row: StaffConfirmationRow) {
  return {
    id: row.id,
    eventRecipeLineId: row.event_recipe_line_id,
    event_recipe_line_id: row.event_recipe_line_id,
    staffName: row.staff_name ?? "Unknown Staff",
    staff_name: row.staff_name ?? "Unknown Staff",
    station: row.station ?? "Unassigned",
    confirmationType: row.confirmation_type ?? "PACKET_REVIEWED",
    confirmation_type: row.confirmation_type ?? "PACKET_REVIEWED",
    status: row.status ?? "PENDING",
    confirmedAt: row.confirmed_at,
    confirmed_at: row.confirmed_at,
    notes: row.notes,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

function mapProfitSnapshot(row: ProfitSnapshotRow) {
  return {
    id: row.id,
    revenue: toNumber(row.revenue),
    foodCost: toNumber(row.food_cost),
    food_cost: toNumber(row.food_cost),
    laborCost: toNumber(row.labor_cost),
    labor_cost: toNumber(row.labor_cost),
    packagingCost: toNumber(row.packaging_cost),
    packaging_cost: toNumber(row.packaging_cost),
    deliveryCost: toNumber(row.delivery_cost),
    delivery_cost: toNumber(row.delivery_cost),
    otherCost: toNumber(row.other_cost),
    other_cost: toNumber(row.other_cost),
    totalCost: toNumber(row.total_cost),
    total_cost: toNumber(row.total_cost),
    grossProfit: toNumber(row.gross_profit),
    gross_profit: toNumber(row.gross_profit),
    marginPercent: toNumber(row.margin_percent),
    margin_percent: toNumber(row.margin_percent),
    menuItemsCount: toNumber(row.menu_items_count),
    menu_items_count: toNumber(row.menu_items_count),
    guestCount: toNumber(row.guest_count),
    guest_count: toNumber(row.guest_count),
    snapshotType: row.snapshot_type ?? "current",
    snapshot_type: row.snapshot_type ?? "current",
    notes: row.notes,
    createdAt: row.created_at,
    created_at: row.created_at,
  };
}

async function ensureKitchenPacketTables(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    ALTER TABLE event_recipe_lines
    ADD COLUMN IF NOT EXISTS prep_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS station TEXT DEFAULT 'Unassigned',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS staff_confirmations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID NOT NULL,
      event_recipe_line_id UUID,
      staff_name TEXT NOT NULL,
      station TEXT NOT NULL,
      confirmation_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      confirmed_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_pnl_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID NOT NULL,
      revenue NUMERIC DEFAULT 0,
      food_cost NUMERIC DEFAULT 0,
      labor_cost NUMERIC DEFAULT 0,
      packaging_cost NUMERIC DEFAULT 0,
      delivery_cost NUMERIC DEFAULT 0,
      other_cost NUMERIC DEFAULT 0,
      total_cost NUMERIC DEFAULT 0,
      gross_profit NUMERIC DEFAULT 0,
      margin_percent NUMERIC DEFAULT 0,
      menu_items_count NUMERIC DEFAULT 0,
      guest_count NUMERIC DEFAULT 0,
      snapshot_type TEXT DEFAULT 'current',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_staff_confirmations_company_event
    ON staff_confirmations(company_id, event_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_event_pnl_snapshots_company_event
    ON event_pnl_snapshots(company_id, event_id);
  `;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  void request;

  try {
    await ensureKitchenPacketTables();

    const currentUser = await getCurrentUser();
    const { eventId } = await context.params;

    const eventRows = await sql`
      SELECT
        id,
        company_id,
        name,
        event_name,
        event_date::text AS event_date,
        guest_count,
        status,
        service_type,
        total_cost,
        revenue,
        food_cost,
        margin,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM events
      WHERE id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      LIMIT 1;
    `;

    const eventRow = eventRows[0] as EventRow | undefined;

    if (!eventRow) {
      return NextResponse.json(
        {
          success: false,
          event: null,
          lines: [],
          staffConfirmations: [],
          staffSummary: {
            total: 0,
            pending: 0,
            confirmed: 0,
            needsHelp: 0,
            blocked: 0,
          },
          snapshots: [],
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const lineRows = await sql`
      SELECT
        event_recipe_lines.id,
        event_recipe_lines.event_id,
        event_recipe_lines.recipe_id,
        COALESCE(recipes.name, recipes.recipe_name, 'Unnamed Recipe') AS recipe_name,
        COALESCE(recipes.category, 'Uncategorized') AS category,
        event_recipe_lines.customer_portions,
        event_recipe_lines.prep_portions,
        event_recipe_lines.portion_size,
        event_recipe_lines.portion_unit,
        event_recipe_lines.waste_buffer_percent,
        event_recipe_lines.required_food_amount,
        event_recipe_lines.total_cost,
        event_recipe_lines.selling_price,
        COALESCE(event_recipe_lines.station, 'Unassigned') AS station,
        COALESCE(event_recipe_lines.prep_status, 'Not Started') AS prep_status
      FROM event_recipe_lines
      LEFT JOIN recipes
        ON recipes.id = event_recipe_lines.recipe_id
        AND recipes.company_id = event_recipe_lines.company_id
      WHERE event_recipe_lines.event_id::text = ${eventId}
        AND event_recipe_lines.company_id::text = ${currentUser.company_id}
      ORDER BY recipes.category ASC NULLS LAST, recipes.name ASC NULLS LAST;
    `;

    const staffRows = await sql`
      SELECT
        id,
        event_recipe_line_id,
        staff_name,
        station,
        confirmation_type,
        status,
        confirmed_at::text AS confirmed_at,
        notes,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM staff_confirmations
      WHERE event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      ORDER BY station ASC, staff_name ASC, confirmation_type ASC;
    `;

    const staffSummaryRows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed,
        COUNT(*) FILTER (WHERE status = 'NEEDS_HELP')::int AS needs_help,
        COUNT(*) FILTER (WHERE status = 'BLOCKED')::int AS blocked
      FROM staff_confirmations
      WHERE event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id};
    `;

    const snapshotRows = await sql`
      SELECT
        id,
        revenue,
        food_cost,
        labor_cost,
        packaging_cost,
        delivery_cost,
        other_cost,
        total_cost,
        gross_profit,
        margin_percent,
        menu_items_count,
        guest_count,
        snapshot_type,
        notes,
        created_at::text AS created_at
      FROM event_pnl_snapshots
      WHERE event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      ORDER BY created_at DESC
      LIMIT 10;
    `;

    const lines = (lineRows as unknown as EventRecipeLineRow[]).map(
      mapRecipeLine,
    );

    const staffConfirmations = (
      staffRows as unknown as StaffConfirmationRow[]
    ).map(mapStaffConfirmation);

    const summary = staffSummaryRows[0] as StaffSummaryRow | undefined;

    const snapshots = (snapshotRows as unknown as ProfitSnapshotRow[]).map(
      mapProfitSnapshot,
    );

    const revenue = toNumber(eventRow.revenue);
    const foodCost = lines.reduce((sum, line) => sum + line.totalCost, 0);
    const margin = revenue > 0 ? ((revenue - foodCost) / revenue) * 100 : 0;

    return NextResponse.json({
      success: true,
      eventId,
      event: mapEvent(eventRow),
      lines,
      data: lines,
      eventProfit: {
        revenue,
        foodCost,
        margin,
      },
      staffConfirmations,
      confirmations: staffConfirmations,
      staffSummary: {
        total: toNumber(summary?.total),
        pending: toNumber(summary?.pending),
        confirmed: toNumber(summary?.confirmed),
        needsHelp: toNumber(summary?.needs_help),
        blocked: toNumber(summary?.blocked),
      },
      snapshots,
    });
  } catch (error: unknown) {
    console.error("GET kitchen packet API error:", error);

    return NextResponse.json(
      {
        success: false,
        event: null,
        lines: [],
        data: [],
        staffConfirmations: [],
        confirmations: [],
        staffSummary: {
          total: 0,
          pending: 0,
          confirmed: 0,
          needsHelp: 0,
          blocked: 0,
        },
        snapshots: [],
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}