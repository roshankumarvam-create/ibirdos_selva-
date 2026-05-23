import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getSessionFromRequest } from "@/app/lib/server-auth";

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

type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

type UnknownRecord = Record<string, unknown>;

type PrepStatus = "Not Started" | "In Progress" | "Completed" | "Blocked";

type EventProfit = {
  revenue: number;
  foodCost: number;
  margin: number;
};

type EventRow = {
  id: string;
  company_id: string | null;
};

type RecipeRow = {
  id: string;
  company_id: string | null;
};

type EventRecipeLineRow = {
  id: string;
  company_id: string | null;
  event_id: string;
  recipe_id: string;
  guest_count: string | number | null;
  eater_percentage: string | number | null;
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
  created_at: string | null;
  updated_at: string | null;
  recipe: UnknownRecord | null;
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
  station?: string;
  prepStation?: string;
  prep_station?: string;
  prepStatus?: string;
  prep_status?: string;
};

class UnauthorizedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthorizedError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown event recipe line error";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function cleanText(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return fallback;
}

function normalizePrepStatus(value: unknown): PrepStatus {
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

function readRecipeNumber(
  recipe: UnknownRecord | null,
  keys: string[],
  fallback = 0,
): number {
  if (!recipe) {
    return fallback;
  }

  for (const key of keys) {
    const parsed = toNumber(recipe[key], Number.NaN);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function readRecipeString(
  recipe: UnknownRecord | null,
  keys: string[],
  fallback: string,
): string {
  if (!recipe) {
    return fallback;
  }

  for (const key of keys) {
    const value = recipe[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
}

async function readJsonBody<TBody>(request: NextRequest): Promise<TBody> {
  try {
    return (await request.json()) as TBody;
  } catch {
    return {} as TBody;
  }
}

 async function getSafeCurrentUser(request: NextRequest): Promise<CurrentUser> { 
  const session = await getSessionFromRequest(request); 

  if ( 
    !session || 
    typeof session.user_id !== "string" || 
    typeof session.email !== "string" || 
    typeof session.role !== "string" ||
    typeof session.company_id !== "string" || 
    session.company_id.trim().length === 0 
  ) { 
    throw new UnauthorizedError(); 
  } 

  return { 
    id: session.user_id, 
    email: session.email, 
    role: session.role, 
    company_id: session.company_id, 
  }; 
} 

async function ensureTables(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS food_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS margin NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS company_id UUID;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS event_recipe_lines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID,
      event_id UUID NOT NULL,
      recipe_id UUID NOT NULL,
      guest_count NUMERIC DEFAULT 0,
      eater_percentage NUMERIC DEFAULT 100,
      customer_portions NUMERIC DEFAULT 0,
      prep_portions NUMERIC DEFAULT 0,
      portion_size NUMERIC DEFAULT 1,
      portion_unit TEXT DEFAULT 'portion',
      waste_buffer_percent NUMERIC DEFAULT 0,
      required_food_amount NUMERIC DEFAULT 0,
      total_cost NUMERIC DEFAULT 0,
      selling_price NUMERIC DEFAULT 0,
      station TEXT DEFAULT 'Unassigned',
      prep_status TEXT DEFAULT 'Not Started',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE event_recipe_lines
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS recipe_id UUID,
    ADD COLUMN IF NOT EXISTS guest_count NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS eater_percentage NUMERIC DEFAULT 100,
    ADD COLUMN IF NOT EXISTS customer_portions NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prep_portions NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS portion_size NUMERIC DEFAULT 1,
    ADD COLUMN IF NOT EXISTS portion_unit TEXT DEFAULT 'portion',
    ADD COLUMN IF NOT EXISTS waste_buffer_percent NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS required_food_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS selling_price NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS station TEXT DEFAULT 'Unassigned',
    ADD COLUMN IF NOT EXISTS prep_status TEXT DEFAULT 'Not Started',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS event_recipe_lines_company_event_idx
    ON event_recipe_lines(company_id, event_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS event_recipe_lines_event_recipe_idx
    ON event_recipe_lines(event_id, recipe_id);
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

async function ensureRecipeAccess(
  recipeId: string,
  companyId: string,
): Promise<boolean> {
  const recipeRows = (await sql`
    SELECT id, company_id
    FROM recipes
    WHERE id::text = ${recipeId}
    LIMIT 1;
  `) as unknown as RecipeRow[];

  if (recipeRows.length === 0) {
    return false;
  }

  const recipeCompanyId = recipeRows[0].company_id;

  if (recipeCompanyId === null || recipeCompanyId === undefined) {
    await sql`
      UPDATE recipes
      SET company_id = ${companyId}
      WHERE id::text = ${recipeId}
        AND company_id IS NULL;
    `;

    return true;
  }

  return String(recipeCompanyId) === companyId;
}

async function getRecipe(
  recipeId: string,
  companyId: string,
): Promise<UnknownRecord | null> {
  const recipeRows = await sql`
    SELECT *
    FROM recipes
    WHERE id::text = ${recipeId}
      AND company_id::text = ${companyId}
    LIMIT 1;
  `;

  const recipe = recipeRows[0] as unknown;

  return isRecord(recipe) ? recipe : null;
}

function getRecipeCostPerServing(recipe: UnknownRecord | null): number {
  const directCostPerServing = readRecipeNumber(
    recipe,
    [
      "cost_per_serving",
      "food_cost_per_serving",
      "product_cost",
      "productCost",
      "loaded_cost_per_serving",
      "loadedCostPerServing",
    ],
    0,
  );

  if (directCostPerServing > 0) {
    return directCostPerServing;
  }

  const totalFoodCost = readRecipeNumber(
    recipe,
    [
      "total_food_cost",
      "totalFoodCost",
      "total_cost",
      "totalCost",
      "food_cost",
      "foodCost",
    ],
    0,
  );

  const servings = readRecipeNumber(
    recipe,
    ["servings", "serving_count", "servingCount", "yield_count", "yield"],
    1,
  );

  return servings > 0 ? totalFoodCost / servings : totalFoodCost;
}

function getRecipeSellingPrice(recipe: UnknownRecord | null): number {
  return readRecipeNumber(
    recipe,
    ["selling_price", "sellingPrice", "price_per_serving", "menu_price"],
    0,
  );
}

function formatLine(row: EventRecipeLineRow) {
  const recipe = isRecord(row.recipe) ? row.recipe : null;

  const recipeName = readRecipeString(
    recipe,
    ["name", "recipe_name", "recipeName", "title"],
    "Unnamed Recipe",
  );

  const category = readRecipeString(
    recipe,
    ["category", "recipe_category", "recipeCategory", "category_name"],
    "Uncategorized",
  );

  const customerPortions = toNumber(row.customer_portions, 0);
  const prepPortions = toNumber(row.prep_portions, 0);
  const portionSize = toNumber(row.portion_size, 1);
  const portionUnit = cleanText(row.portion_unit, "portion");
  const wasteBufferPercent = toNumber(row.waste_buffer_percent, 0);
  const requiredFoodAmount = toNumber(row.required_food_amount, 0);
  const totalCost = toNumber(row.total_cost, 0);
  const sellingPrice = toNumber(row.selling_price, 0);
  const station = cleanText(row.station, "Unassigned");
  const prepStatus = normalizePrepStatus(row.prep_status);

  return {
    id: row.id,
    companyId: row.company_id,
    company_id: row.company_id,
    eventId: row.event_id,
    event_id: row.event_id,
    recipeId: row.recipe_id,
    recipe_id: row.recipe_id,
    recipe,
    recipeName,
    recipe_name: recipeName,
    name: recipeName,
    category,
    recipeCategory: category,
    recipe_category: category,
    guestCount: toNumber(row.guest_count, 0),
    guest_count: toNumber(row.guest_count, 0),
    eaterPercentage: toNumber(row.eater_percentage, 100),
    eater_percentage: toNumber(row.eater_percentage, 100),
    customerPortions,
    customer_portions: customerPortions,
    prepPortions,
    prep_portions: prepPortions,
    kitchenPrepPortions: prepPortions,
    kitchen_prep_portions: prepPortions,
    portionSize,
    portion_size: portionSize,
    portionUnit,
    portion_unit: portionUnit,
    wasteBufferPercent,
    waste_buffer_percent: wasteBufferPercent,
    requiredFoodAmount,
    required_food_amount: requiredFoodAmount,
    totalCost,
    total_cost: totalCost,
    sellingPrice,
    selling_price: sellingPrice,
    station,
    prepStation: station,
    prep_station: station,
    prepStatus,
    prep_status: prepStatus,
    status: prepStatus,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

async function getLines(eventId: string, companyId: string) {
  const lineRows = await sql`
    SELECT
      erl.*,
      to_jsonb(r.*) AS recipe
    FROM event_recipe_lines erl
    LEFT JOIN recipes r
      ON r.id::text = erl.recipe_id::text
      AND r.company_id::text = ${companyId}
    WHERE erl.event_id::text = ${eventId}
      AND erl.company_id::text = ${companyId}
    ORDER BY erl.created_at ASC;
  `;

  return (lineRows as unknown as EventRecipeLineRow[]).map(formatLine);
}

async function getEventProfit(
  eventId: string,
  companyId: string,
): Promise<EventProfit> {
  const rows = await sql`
    SELECT
      COALESCE(
        SUM(
          COALESCE(customer_portions, 0)::numeric *
          COALESCE(selling_price, 0)::numeric
        ),
        0
      )::numeric AS revenue,
      COALESCE(SUM(COALESCE(total_cost, 0)::numeric), 0)::numeric AS food_cost
    FROM event_recipe_lines
    WHERE event_id::text = ${eventId}
      AND company_id::text = ${companyId};
  `;

  const firstRow = rows[0] as UnknownRecord | undefined;
  const revenue = toNumber(firstRow?.revenue, 0);
  const foodCost = toNumber(firstRow?.food_cost, 0);
  const margin = revenue > 0 ? ((revenue - foodCost) / revenue) * 100 : 0;

  await sql`
    UPDATE events
    SET
      revenue = ${revenue},
      food_cost = ${foodCost},
      total_cost = ${foodCost},
      margin = ${margin},
      updated_at = NOW()
    WHERE id::text = ${eventId}
      AND company_id::text = ${companyId};
  `;

  return {
    revenue,
    foodCost,
    margin,
  };
}

function getResponseStatus(error: unknown): number {
  return error instanceof UnauthorizedError ? 401 : 500;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  

  try {
    const currentUser = await getSafeCurrentUser(request);
    const { eventId } = await context.params;

    await ensureTables();

    const hasEventAccess = await ensureEventAccess(
      eventId,
      currentUser.company_id,
    );

    if (!hasEventAccess) {
      return NextResponse.json(
        {
          success: false,
          lines: [],
          data: [],
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const lines = await getLines(eventId, currentUser.company_id);
    const eventProfit = await getEventProfit(eventId, currentUser.company_id);

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
    const currentUser = await getSafeCurrentUser(request);
    const { eventId } = await context.params;
    const body = await readJsonBody<RecipeLineBody>(request);

    await ensureTables();

    const hasEventAccess = await ensureEventAccess(
      eventId,
      currentUser.company_id,
    );

    if (!hasEventAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const recipeId = cleanText(body.recipeId ?? body.recipe_id, "");

    if (!recipeId) {
      return NextResponse.json(
        {
          success: false,
          error: "recipeId is required",
        },
        { status: 400 },
      );
    }

    const hasRecipeAccess = await ensureRecipeAccess(
      recipeId,
      currentUser.company_id,
    );

    if (!hasRecipeAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Recipe not found",
        },
        { status: 404 },
      );
    }

    const recipe = await getRecipe(recipeId, currentUser.company_id);
    const recipeCostPerServing = getRecipeCostPerServing(recipe);
    const recipeSellingPrice = getRecipeSellingPrice(recipe);

    const guestCount = toNumber(body.guestCount ?? body.guest_count, 0);
    const eaterPercentage = toNumber(
      body.eaterPercentage ?? body.eater_percentage,
      100,
    );

    const calculatedCustomerPortions = Math.round(
      guestCount * (eaterPercentage / 100),
    );

    const customerPortions = Math.round(
      toNumber(
        body.customerPortions ?? body.customer_portions,
        calculatedCustomerPortions,
      ),
    );

    const wasteBufferPercent = toNumber(
      body.wasteBufferPercent ?? body.waste_buffer_percent,
      0,
    );

    const calculatedPrepPortions = Math.ceil(
      customerPortions * (1 + wasteBufferPercent / 100),
    );

    const prepPortions = Math.round(
      toNumber(body.prepPortions ?? body.prep_portions, calculatedPrepPortions),
    );

    const portionSize = toNumber(body.portionSize ?? body.portion_size, 1);

    const portionUnit = cleanText(
      body.portionUnit ?? body.portion_unit,
      "portion",
    );

    const requiredFoodAmount = toNumber(
      body.requiredFoodAmount ?? body.required_food_amount,
      prepPortions * portionSize,
    );

    const sellingPrice = toNumber(
      body.sellingPrice ?? body.selling_price,
      recipeSellingPrice,
    );

    const totalCost = toNumber(
      body.totalCost ?? body.total_cost,
      prepPortions * recipeCostPerServing,
    );

    const station = cleanText(
      body.station ?? body.prepStation ?? body.prep_station,
      "Unassigned",
    );

    const prepStatus = normalizePrepStatus(body.prepStatus ?? body.prep_status);

    const existingRows = await sql`
      SELECT id
      FROM event_recipe_lines
      WHERE event_id::text = ${eventId}
        AND recipe_id::text = ${recipeId}
        AND company_id::text = ${currentUser.company_id}
      LIMIT 1;
    `;

    const existingLineRows = existingRows as unknown as Array<{ id: string }>;

    const lineRows =
      existingLineRows.length > 0
        ? await sql`
            UPDATE event_recipe_lines
            SET
              guest_count = ${guestCount},
              eater_percentage = ${eaterPercentage},
              customer_portions = ${customerPortions},
              prep_portions = ${prepPortions},
              portion_size = ${portionSize},
              portion_unit = ${portionUnit},
              waste_buffer_percent = ${wasteBufferPercent},
              required_food_amount = ${requiredFoodAmount},
              total_cost = ${totalCost},
              selling_price = ${sellingPrice},
              station = ${station},
              prep_status = ${prepStatus},
              updated_at = NOW()
            WHERE id::text = ${existingLineRows[0].id}
              AND event_id::text = ${eventId}
              AND company_id::text = ${currentUser.company_id}
            RETURNING *;
          `
        : await sql`
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
              ${totalCost},
              ${sellingPrice},
              ${station},
              ${prepStatus},
              NOW(),
              NOW()
            )
            RETURNING *;
          `;

    const lineRow = lineRows[0] as unknown as EventRecipeLineRow;
    lineRow.recipe = recipe;

    const line = formatLine(lineRow);
    const lines = await getLines(eventId, currentUser.company_id);
    const eventProfit = await getEventProfit(eventId, currentUser.company_id);

    return NextResponse.json({
      success: true,
      eventId,
      line,
      lines,
      data: lines,
      eventProfit,
    });
  } catch (error: unknown) {
    console.error("POST event recipe line error:", error);

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
    const currentUser = await getSafeCurrentUser(request);
    const { eventId } = await context.params;
    const body = await readJsonBody<RecipeLineBody>(request);

    await ensureTables();

    const hasEventAccess = await ensureEventAccess(
      eventId,
      currentUser.company_id,
    );

    if (!hasEventAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const lineId = cleanText(body.id ?? body.lineId ?? body.line_id, "");

    if (!lineId) {
      return NextResponse.json(
        {
          success: false,
          error: "lineId is required",
        },
        { status: 400 },
      );
    }

    const station = cleanText(
      body.station ?? body.prepStation ?? body.prep_station,
      "Unassigned",
    );

    const prepStatus = normalizePrepStatus(body.prepStatus ?? body.prep_status);

    const updatedRows = await sql`
      UPDATE event_recipe_lines
      SET
        station = ${station},
        prep_status = ${prepStatus},
        updated_at = NOW()
      WHERE id::text = ${lineId}
        AND event_id::text = ${eventId}
        AND company_id::text = ${currentUser.company_id}
      RETURNING *;
    `;

    if (updatedRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Line not found",
        },
        { status: 404 },
      );
    }

    const lines = await getLines(eventId, currentUser.company_id);
    const eventProfit = await getEventProfit(eventId, currentUser.company_id);

    return NextResponse.json({
      success: true,
      eventId,
      lines,
      data: lines,
      eventProfit,
    });
  } catch (error: unknown) {
    console.error("PATCH event recipe line error:", error);

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
    const currentUser = await getSafeCurrentUser(request);
    const { eventId } = await context.params;
    const body = await readJsonBody<RecipeLineBody>(request);

    await ensureTables();

    const hasEventAccess = await ensureEventAccess(
      eventId,
      currentUser.company_id,
    );

    if (!hasEventAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const lineId = cleanText(body.id ?? body.lineId ?? body.line_id, "");

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

    const lines = await getLines(eventId, currentUser.company_id);
    const eventProfit = await getEventProfit(eventId, currentUser.company_id);

    return NextResponse.json({
      success: true,
      eventId,
      lines,
      data: lines,
      eventProfit,
    });
  } catch (error: unknown) {
    console.error("DELETE event recipe line error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}