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

type PrepStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";

type StationName =
  | "Unassigned"
  | "Hot Station"
  | "Cold Station"
  | "Grill"
  | "Fryer"
  | "Expo"
  | "Packing"
  | "Delivery";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

type CurrentUser = {
  id: string;
  email: string;
  role?: string;
  company_id: string;
};

type RecipeLineBody = {
  id?: string;
  lineId?: string;
  line_id?: string;
  recipeId?: string;
  recipe_id?: string;
  guestCount?: number | string;
  guest_count?: number | string;
  eaterPercentage?: number | string;
  eater_percentage?: number | string;
  customerPortions?: number | string;
  customer_portions?: number | string;
  prepPortions?: number | string;
  prep_portions?: number | string;
  portionSize?: number | string;
  portion_size?: number | string;
  portionUnit?: string;
  portion_unit?: string;
  wasteBufferPercent?: number | string;
  waste_buffer_percent?: number | string;
  requiredFoodAmount?: number | string;
  required_food_amount?: number | string;
  totalCost?: number | string;
  total_cost?: number | string;
  sellingPrice?: number | string;
  selling_price?: number | string;
  recipeYield?: number | string;
  recipe_yield?: number | string;
  batchCount?: number | string;
  batch_count?: number | string;
  roundedBatchCount?: number | string;
  rounded_batch_count?: number | string;
  station?: string;
  prepStation?: string;
  prep_station?: string;
  prepStatus?: string;
  prep_status?: string;
};

type EventRow = {
  id: string;
  company_id: string | null;
};

type RecipeRow = {
  id: string;
  name: string | null;
  category: string | null;
  servings: string | number | null;
  selling_price: string | number | null;
  total_food_cost: string | number | null;
  cost_per_serving: string | number | null;
};

type EventRecipeLineRow = {
  id: string;
  company_id: string;
  event_id: string;
  recipe_id: string | null;
  recipe_name: string | null;
  category: string | null;
  guest_count: string | number | null;
  eater_percentage: string | number | null;
  customer_portions: string | number | null;
  prep_portions: string | number | null;
  portion_size: string | number | null;
  portion_unit: string | null;
  waste_buffer_percent: string | number | null;
  required_food_amount: string | number | null;
  recipe_yield: string | number | null;
  batch_count: string | number | null;
  rounded_batch_count: string | number | null;
  total_cost: string | number | null;
  selling_price: string | number | null;
  station: string | null;
  prep_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type EventProfit = {
  revenue: number;
  foodCost: number;
  margin: number;
};

class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown recipe line error";
}

function getResponseStatus(error: unknown): number {
  return error instanceof UnauthorizedError ? 401 : 500;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.replace(/[$,%]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function cleanText(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

function cleanNullableText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  return cleanValue.length > 0 ? cleanValue : null;
}

function cleanPrepStatus(value: unknown): PrepStatus {
  if (
    value === "Not Started" ||
    value === "In Progress" ||
    value === "Completed" ||
    value === "Blocked"
  ) {
    return value;
  }

  return "Not Started";
}

function cleanStation(value: unknown): StationName {
  if (
    value === "Unassigned" ||
    value === "Hot Station" ||
    value === "Cold Station" ||
    value === "Grill" ||
    value === "Fryer" ||
    value === "Expo" ||
    value === "Packing" ||
    value === "Delivery"
  ) {
    return value;
  }

  return "Unassigned";
}

async function readJsonBody<TBody>(request: NextRequest): Promise<TBody> {
  try {
    return (await request.json()) as TBody;
  } catch {
    return {} as TBody;
  }
}

async function getSafeCurrentUser(): Promise<CurrentUser> {
  const currentUser = (await getCurrentUser()) as Partial<CurrentUser> | null;

  if (
    !currentUser ||
    typeof currentUser.company_id !== "string" ||
    currentUser.company_id.trim().length === 0
  ) {
    throw new UnauthorizedError();
  }

  return {
    id: typeof currentUser.id === "string" ? currentUser.id : "",
    email: typeof currentUser.email === "string" ? currentUser.email : "",
    role: typeof currentUser.role === "string" ? currentUser.role : "user",
    company_id: currentUser.company_id,
  };
}

async function ensureEventRecipeLineTable(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_recipe_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID NOT NULL,
      recipe_id UUID,
      guest_count NUMERIC NOT NULL DEFAULT 0,
      eater_percentage NUMERIC NOT NULL DEFAULT 100,
      customer_portions NUMERIC NOT NULL DEFAULT 0,
      prep_portions NUMERIC NOT NULL DEFAULT 0,
      portion_size NUMERIC NOT NULL DEFAULT 1,
      portion_unit TEXT NOT NULL DEFAULT 'portion',
      waste_buffer_percent NUMERIC NOT NULL DEFAULT 0,
      required_food_amount NUMERIC NOT NULL DEFAULT 0,
      recipe_yield NUMERIC NOT NULL DEFAULT 1,
      batch_count NUMERIC NOT NULL DEFAULT 0,
      rounded_batch_count NUMERIC NOT NULL DEFAULT 0,
      total_cost NUMERIC NOT NULL DEFAULT 0,
      selling_price NUMERIC NOT NULL DEFAULT 0,
      station TEXT NOT NULL DEFAULT 'Unassigned',
      prep_status TEXT NOT NULL DEFAULT 'Not Started',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE event_recipe_lines
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS recipe_id UUID,
    ADD COLUMN IF NOT EXISTS guest_count NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS eater_percentage NUMERIC NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS customer_portions NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prep_portions NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS portion_size NUMERIC NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS portion_unit TEXT NOT NULL DEFAULT 'portion',
    ADD COLUMN IF NOT EXISTS waste_buffer_percent NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS required_food_amount NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS recipe_yield NUMERIC NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS batch_count NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rounded_batch_count NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS station TEXT NOT NULL DEFAULT 'Unassigned',
    ADD COLUMN IF NOT EXISTS prep_status TEXT NOT NULL DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_event_recipe_lines_company_event
    ON event_recipe_lines(company_id, event_id);
  `;
}

async function ensureEventAccess(
  eventId: string,
  companyId: string,
): Promise<boolean> {
  const eventRows = (await sql`
    SELECT id, company_id
    FROM events
    WHERE id::text = ${eventId}
      AND company_id::text = ${companyId}
    LIMIT 1;
  `) as unknown as EventRow[];

  return eventRows.length > 0;
}

async function getRecipe(
  recipeId: string,
  companyId: string,
): Promise<RecipeRow | null> {
  const recipeRows = (await sql`
    SELECT
      id,
      name,
      category,
      servings,
      selling_price,
      total_food_cost,
      cost_per_serving
    FROM recipes
    WHERE id::text = ${recipeId}
      AND company_id::text = ${companyId}
    LIMIT 1;
  `) as unknown as RecipeRow[];

  return recipeRows[0] ?? null;
}

function getRecipeCostPerServing(recipe: RecipeRow): number {
  const directCostPerServing = toNumber(recipe.cost_per_serving, 0);

  if (directCostPerServing > 0) {
    return directCostPerServing;
  }

  const servings = toNumber(recipe.servings, 1);
  const safeServings = servings > 0 ? servings : 1;
  const totalFoodCost = toNumber(recipe.total_food_cost, 0);

  return totalFoodCost / safeServings;
}

async function getEventRecipeLines(
  eventId: string,
  companyId: string,
): Promise<EventRecipeLineRow[]> {
  return (await sql`
    SELECT
      erl.id,
      erl.company_id,
      erl.event_id,
      erl.recipe_id,
      COALESCE(r.name, 'Unnamed Recipe') AS recipe_name,
      COALESCE(r.category, 'Other') AS category,
      erl.guest_count,
      erl.eater_percentage,
      erl.customer_portions,
      erl.prep_portions,
      erl.portion_size,
      erl.portion_unit,
      erl.waste_buffer_percent,
      erl.required_food_amount,
      erl.recipe_yield,
      erl.batch_count,
      erl.rounded_batch_count,
      erl.total_cost,
      erl.selling_price,
      erl.station,
      erl.prep_status,
      erl.created_at::text AS created_at,
      erl.updated_at::text AS updated_at
    FROM event_recipe_lines erl
    LEFT JOIN recipes r
      ON r.id = erl.recipe_id
      AND r.company_id = erl.company_id
    WHERE erl.event_id::text = ${eventId}
      AND erl.company_id::text = ${companyId}
    ORDER BY erl.created_at ASC;
  `) as unknown as EventRecipeLineRow[];
}

function mapLine(row: EventRecipeLineRow) {
  const customerPortions = toNumber(row.customer_portions, 0);
  const sellingPrice = toNumber(row.selling_price, 0);
  const prepPortions = toNumber(row.prep_portions, 0);
  const recipeYield = toNumber(row.recipe_yield, 1);
  const safeRecipeYield = recipeYield > 0 ? recipeYield : 1;
  const batchCount =
    toNumber(row.batch_count, 0) || prepPortions / safeRecipeYield;
  const roundedBatchCount =
    toNumber(row.rounded_batch_count, 0) || Math.ceil(batchCount);

  return {
    id: row.id,
    companyId: row.company_id,
    company_id: row.company_id,
    eventId: row.event_id,
    event_id: row.event_id,
    recipeId: row.recipe_id,
    recipe_id: row.recipe_id,
    recipeName: row.recipe_name ?? "Unnamed Recipe",
    recipe_name: row.recipe_name ?? "Unnamed Recipe",
    category: row.category ?? "Other",
    guestCount: toNumber(row.guest_count, 0),
    guest_count: toNumber(row.guest_count, 0),
    eaterPercentage: toNumber(row.eater_percentage, 100),
    eater_percentage: toNumber(row.eater_percentage, 100),
    customerPortions,
    customer_portions: customerPortions,
    prepPortions,
    prep_portions: prepPortions,
    portionSize: toNumber(row.portion_size, 1),
    portion_size: toNumber(row.portion_size, 1),
    portionUnit: row.portion_unit ?? "portion",
    portion_unit: row.portion_unit ?? "portion",
    wasteBufferPercent: toNumber(row.waste_buffer_percent, 0),
    waste_buffer_percent: toNumber(row.waste_buffer_percent, 0),
    requiredFoodAmount: toNumber(row.required_food_amount, 0),
    required_food_amount: toNumber(row.required_food_amount, 0),
    recipeYield: safeRecipeYield,
    recipe_yield: safeRecipeYield,
    batchCount,
    batch_count: batchCount,
    roundedBatchCount,
    rounded_batch_count: roundedBatchCount,
    kitchenBatches: roundedBatchCount,
    kitchen_batches: roundedBatchCount,
    totalCost: toNumber(row.total_cost, 0),
    total_cost: toNumber(row.total_cost, 0),
    sellingPrice,
    selling_price: sellingPrice,
    quotePrice: customerPortions * sellingPrice,
    quote_price: customerPortions * sellingPrice,
    station: cleanStation(row.station),
    prepStation: cleanStation(row.station),
    prep_station: cleanStation(row.station),
    prepStatus: cleanPrepStatus(row.prep_status),
    prep_status: cleanPrepStatus(row.prep_status),
    status: cleanPrepStatus(row.prep_status),
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

function calculateEventProfit(lines: EventRecipeLineRow[]): EventProfit {
  const revenue = lines.reduce((total, line) => {
    return (
      total +
      toNumber(line.customer_portions, 0) * toNumber(line.selling_price, 0)
    );
  }, 0);

  const foodCost = lines.reduce((total, line) => {
    return total + toNumber(line.total_cost, 0);
  }, 0);

  const margin = revenue > 0 ? ((revenue - foodCost) / revenue) * 100 : 0;

  return {
    revenue,
    foodCost,
    margin,
  };
}

function getLineId(body: RecipeLineBody): string {
  return (
    cleanText(body.id) ||
    cleanText(body.lineId) ||
    cleanText(body.line_id)
  );
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  void request;

  try {
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;

    await ensureEventRecipeLineTable();

    const hasAccess = await ensureEventAccess(eventId, currentUser.company_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          eventId,
          lines: [],
          data: [],
          eventProfit: {
            revenue: 0,
            foodCost: 0,
            margin: 0,
          },
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const rows = await getEventRecipeLines(eventId, currentUser.company_id);
    const lines = rows.map(mapLine);
    const eventProfit = calculateEventProfit(rows);

    return NextResponse.json({
      success: true,
      eventId,
      lines,
      data: lines,
      eventProfit,
    });
  } catch (error: unknown) {
    console.error("GET event recipe lines error:", error);

    return NextResponse.json(
      {
        success: false,
        lines: [],
        data: [],
        eventProfit: {
          revenue: 0,
          foodCost: 0,
          margin: 0,
        },
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;
    const body = await readJsonBody<RecipeLineBody>(request);

    await ensureEventRecipeLineTable();

    const hasAccess = await ensureEventAccess(eventId, currentUser.company_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const recipeId = cleanText(body.recipeId ?? body.recipe_id);

    if (!recipeId) {
      return NextResponse.json(
        {
          success: false,
          error: "recipeId is required",
        },
        { status: 400 },
      );
    }

    const recipe = await getRecipe(recipeId, currentUser.company_id);

    if (!recipe) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not found",
        },
        { status: 404 },
      );
    }

    const guestCount = toNumber(body.guestCount ?? body.guest_count, 0);
    const eaterPercentage = toNumber(
      body.eaterPercentage ?? body.eater_percentage,
      100,
    );

    const customerPortions =
      toNumber(body.customerPortions ?? body.customer_portions, 0) ||
      Math.round(guestCount * (eaterPercentage / 100));

    const wasteBufferPercent = toNumber(
      body.wasteBufferPercent ?? body.waste_buffer_percent,
      0,
    );

    const prepPortions =
      toNumber(body.prepPortions ?? body.prep_portions, 0) ||
      Math.ceil(customerPortions * (1 + wasteBufferPercent / 100));

    const portionSize = toNumber(body.portionSize ?? body.portion_size, 1);
    const portionUnit =
      cleanText(body.portionUnit ?? body.portion_unit) || "portion";

    const requiredFoodAmount =
      toNumber(body.requiredFoodAmount ?? body.required_food_amount, 0) ||
      prepPortions * portionSize;

    const recipeYield =
      toNumber(body.recipeYield ?? body.recipe_yield, 0) ||
      toNumber(recipe.servings, 1) ||
      1;

    const safeRecipeYield = recipeYield > 0 ? recipeYield : 1;
    const batchCount =
      toNumber(body.batchCount ?? body.batch_count, 0) ||
      prepPortions / safeRecipeYield;
    const roundedBatchCount =
      toNumber(body.roundedBatchCount ?? body.rounded_batch_count, 0) ||
      Math.ceil(batchCount);

    const sellingPrice =
      toNumber(body.sellingPrice ?? body.selling_price, 0) ||
      toNumber(recipe.selling_price, 0);

    const totalCost =
      toNumber(body.totalCost ?? body.total_cost, 0) ||
      getRecipeCostPerServing(recipe) * prepPortions;

    const station = cleanStation(
      body.station ?? body.prepStation ?? body.prep_station,
    );
    const prepStatus = cleanPrepStatus(body.prepStatus ?? body.prep_status);

    await sql`
      INSERT INTO event_recipe_lines (
        company_id,
        event_id,
        recipe_id,
        guest_count,
        eater_percentage,
        customer_portions,
        prep_portions,
        portion_size,
        portion_unit,
        waste_buffer_percent,
        required_food_amount,
        recipe_yield,
        batch_count,
        rounded_batch_count,
        total_cost,
        selling_price,
        station,
        prep_status,
        created_at,
        updated_at
      )
      VALUES (
        ${currentUser.company_id},
        ${eventId},
        ${recipeId},
        ${guestCount},
        ${eaterPercentage},
        ${customerPortions},
        ${prepPortions},
        ${portionSize},
        ${portionUnit},
        ${wasteBufferPercent},
        ${requiredFoodAmount},
        ${safeRecipeYield},
        ${batchCount},
        ${roundedBatchCount},
        ${totalCost},
        ${sellingPrice},
        ${station},
        ${prepStatus},
        NOW(),
        NOW()
      );
    `;

    const rows = await getEventRecipeLines(eventId, currentUser.company_id);
    const lines = rows.map(mapLine);
    const eventProfit = calculateEventProfit(rows);

    return NextResponse.json({
      success: true,
      eventId,
      lines,
      data: lines,
      eventProfit,
    });
  } catch (error: unknown) {
    console.error("POST event recipe lines error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;
    const body = await readJsonBody<RecipeLineBody>(request);

    await ensureEventRecipeLineTable();

    const hasAccess = await ensureEventAccess(eventId, currentUser.company_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const lineId = getLineId(body);

    if (!lineId) {
      return NextResponse.json(
        {
          success: false,
          error: "lineId is required",
        },
        { status: 400 },
      );
    }

    const existingRows = (await sql`
      SELECT
        id,
        company_id,
        event_id,
        recipe_id,
        guest_count,
        eater_percentage,
        customer_portions,
        prep_portions,
        portion_size,
        portion_unit,
        waste_buffer_percent,
        required_food_amount,
        recipe_yield,
        batch_count,
        rounded_batch_count,
        total_cost,
        selling_price,
        station,
        prep_status,
        created_at::text AS created_at,
        updated_at::text AS updated_at
      FROM event_recipe_lines
      WHERE id::text = ${lineId}
        AND event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      LIMIT 1;
    `) as unknown as EventRecipeLineRow[];

    const existingLine = existingRows[0];

    if (!existingLine) {
      return NextResponse.json(
        {
          success: false,
          error: "Event recipe line not found",
        },
        { status: 404 },
      );
    }

    const nextGuestCount =
      body.guestCount !== undefined || body.guest_count !== undefined
        ? toNumber(body.guestCount ?? body.guest_count, 0)
        : toNumber(existingLine.guest_count, 0);

    const nextEaterPercentage =
      body.eaterPercentage !== undefined || body.eater_percentage !== undefined
        ? toNumber(body.eaterPercentage ?? body.eater_percentage, 100)
        : toNumber(existingLine.eater_percentage, 100);

    const nextCustomerPortions =
      body.customerPortions !== undefined || body.customer_portions !== undefined
        ? toNumber(body.customerPortions ?? body.customer_portions, 0)
        : toNumber(existingLine.customer_portions, 0);

    const nextWasteBufferPercent =
      body.wasteBufferPercent !== undefined ||
      body.waste_buffer_percent !== undefined
        ? toNumber(body.wasteBufferPercent ?? body.waste_buffer_percent, 0)
        : toNumber(existingLine.waste_buffer_percent, 0);

    const nextPrepPortions =
      body.prepPortions !== undefined || body.prep_portions !== undefined
        ? toNumber(body.prepPortions ?? body.prep_portions, 0)
        : toNumber(existingLine.prep_portions, 0);

    const nextPortionSize =
      body.portionSize !== undefined || body.portion_size !== undefined
        ? toNumber(body.portionSize ?? body.portion_size, 1)
        : toNumber(existingLine.portion_size, 1);

    const nextPortionUnit =
      body.portionUnit !== undefined || body.portion_unit !== undefined
        ? cleanText(body.portionUnit ?? body.portion_unit, "portion")
        : cleanText(existingLine.portion_unit, "portion");

    const nextRequiredFoodAmount =
      body.requiredFoodAmount !== undefined ||
      body.required_food_amount !== undefined
        ? toNumber(body.requiredFoodAmount ?? body.required_food_amount, 0)
        : nextPrepPortions * nextPortionSize;

    const nextRecipeYield =
      body.recipeYield !== undefined || body.recipe_yield !== undefined
        ? toNumber(body.recipeYield ?? body.recipe_yield, 1)
        : toNumber(existingLine.recipe_yield, 1);

    const safeRecipeYield = nextRecipeYield > 0 ? nextRecipeYield : 1;
    const nextBatchCount =
      body.batchCount !== undefined || body.batch_count !== undefined
        ? toNumber(body.batchCount ?? body.batch_count, 0)
        : nextPrepPortions / safeRecipeYield;

    const nextRoundedBatchCount =
      body.roundedBatchCount !== undefined ||
      body.rounded_batch_count !== undefined
        ? toNumber(body.roundedBatchCount ?? body.rounded_batch_count, 0)
        : Math.ceil(nextBatchCount);

    const nextTotalCost =
      body.totalCost !== undefined || body.total_cost !== undefined
        ? toNumber(body.totalCost ?? body.total_cost, 0)
        : toNumber(existingLine.total_cost, 0);

    const nextSellingPrice =
      body.sellingPrice !== undefined || body.selling_price !== undefined
        ? toNumber(body.sellingPrice ?? body.selling_price, 0)
        : toNumber(existingLine.selling_price, 0);

    const nextStation =
      body.station !== undefined ||
      body.prepStation !== undefined ||
      body.prep_station !== undefined
        ? cleanStation(body.station ?? body.prepStation ?? body.prep_station)
        : cleanStation(existingLine.station);

    const nextPrepStatus =
      body.prepStatus !== undefined || body.prep_status !== undefined
        ? cleanPrepStatus(body.prepStatus ?? body.prep_status)
        : cleanPrepStatus(existingLine.prep_status);

    await sql`
      UPDATE event_recipe_lines
      SET
        guest_count = ${nextGuestCount},
        eater_percentage = ${nextEaterPercentage},
        customer_portions = ${nextCustomerPortions},
        prep_portions = ${nextPrepPortions},
        portion_size = ${nextPortionSize},
        portion_unit = ${nextPortionUnit},
        waste_buffer_percent = ${nextWasteBufferPercent},
        required_food_amount = ${nextRequiredFoodAmount},
        recipe_yield = ${safeRecipeYield},
        batch_count = ${nextBatchCount},
        rounded_batch_count = ${nextRoundedBatchCount},
        total_cost = ${nextTotalCost},
        selling_price = ${nextSellingPrice},
        station = ${nextStation},
        prep_status = ${nextPrepStatus},
        updated_at = NOW()
      WHERE id::text = ${lineId}
        AND event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id};
    `;

    const rows = await getEventRecipeLines(eventId, currentUser.company_id);
    const lines = rows.map(mapLine);
    const eventProfit = calculateEventProfit(rows);

    return NextResponse.json({
      success: true,
      eventId,
      lines,
      data: lines,
      eventProfit,
    });
  } catch (error: unknown) {
    console.error("PATCH event recipe lines error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;
    const body = await readJsonBody<RecipeLineBody>(request);

    await ensureEventRecipeLineTable();

    const hasAccess = await ensureEventAccess(eventId, currentUser.company_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const lineId = getLineId(body);

    if (!lineId) {
      return NextResponse.json(
        {
          success: false,
          error: "lineId is required",
        },
        { status: 400 },
      );
    }

    await sql`
      DELETE FROM event_recipe_lines
      WHERE id::text = ${lineId}
        AND event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id};
    `;

    const rows = await getEventRecipeLines(eventId, currentUser.company_id);
    const lines = rows.map(mapLine);
    const eventProfit = calculateEventProfit(rows);

    return NextResponse.json({
      success: true,
      eventId,
      lines,
      data: lines,
      eventProfit,
    });
  } catch (error: unknown) {
    console.error("DELETE event recipe lines error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}