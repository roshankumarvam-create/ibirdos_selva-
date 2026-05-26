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

type ChecklistType =
  | "PACKAGING"
  | "DELIVERY_TRANSFER"
  | "TEMPERATURE_LOG"
  | "PREP_STATUS"
  | "STAFF_NOTE";

type LogStatus =
  | "PENDING"
  | "CHECKED"
  | "COMPLETED"
  | "NEEDS_HELP"
  | "BLOCKED";

type FoodType = "Hot" | "Cold";

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

type KitchenPacketLogBody = {
  eventRecipeLineId?: string | null;
  event_recipe_line_id?: string | null;
  checklistType?: string;
  checklist_type?: string;
  itemName?: string;
  item_name?: string;
  status?: string;
  foodType?: string | null;
  food_type?: string | null;
  kitchenTemp?: string | null;
  kitchen_temp?: string | null;
  loadingTemp?: string | null;
  loading_temp?: string | null;
  deliveryTemp?: string | null;
  delivery_temp?: string | null;
  checkedBy?: string | null;
  checked_by?: string | null;
  notes?: string | null;
};

type KitchenPacketLogRow = {
  id: string;
  company_id: string;
  event_id: string;
  event_recipe_line_id: string | null;
  checklist_type: string;
  item_name: string;
  status: string;
  food_type: string | null;
  kitchen_temp: string | null;
  loading_temp: string | null;
  delivery_temp: string | null;
  checked_by: string | null;
  checked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  company_id: string | null;
};

type EventRecipeLineRow = {
  id: string;
  company_id: string | null;
  event_id: string;
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

  return "Unknown kitchen packet log error";
}

function getResponseStatus(error: unknown): number {
  return error instanceof UnauthorizedError ? 401 : 500;
}

function isChecklistType(value: string): value is ChecklistType {
  return [
    "PACKAGING",
    "DELIVERY_TRANSFER",
    "TEMPERATURE_LOG",
    "PREP_STATUS",
    "STAFF_NOTE",
  ].includes(value);
}

function isLogStatus(value: string): value is LogStatus {
  return ["PENDING", "CHECKED", "COMPLETED", "NEEDS_HELP", "BLOCKED"].includes(
    value,
  );
}

function isFoodType(value: string): value is FoodType {
  return ["Hot", "Cold"].includes(value);
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
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
    typeof currentUser.id !== "string" ||
    typeof currentUser.email !== "string" ||
    typeof currentUser.company_id !== "string" ||
    currentUser.company_id.trim().length === 0
  ) {
    throw new UnauthorizedError();
  }

  return {
    id: currentUser.id,
    email: currentUser.email,
    role: typeof currentUser.role === "string" ? currentUser.role : "user",
    company_id: currentUser.company_id,
  };
}

async function ensureKitchenPacketLogsTable(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    ALTER TABLE events
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS kitchen_packet_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      event_id UUID NOT NULL,
      event_recipe_line_id UUID,
      checklist_type TEXT NOT NULL,
      item_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      food_type TEXT,
      kitchen_temp TEXT,
      loading_temp TEXT,
      delivery_temp TEXT,
      checked_by TEXT,
      checked_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE kitchen_packet_logs
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS event_id UUID,
    ADD COLUMN IF NOT EXISTS event_recipe_line_id UUID,
    ADD COLUMN IF NOT EXISTS checklist_type TEXT,
    ADD COLUMN IF NOT EXISTS item_name TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS food_type TEXT,
    ADD COLUMN IF NOT EXISTS kitchen_temp TEXT,
    ADD COLUMN IF NOT EXISTS loading_temp TEXT,
    ADD COLUMN IF NOT EXISTS delivery_temp TEXT,
    ADD COLUMN IF NOT EXISTS checked_by TEXT,
    ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_kitchen_packet_logs_company_event_type
    ON kitchen_packet_logs(company_id, event_id, checklist_type);
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

async function ensureEventRecipeLineAccess(
  eventRecipeLineId: string | null,
  eventId: string,
  companyId: string,
): Promise<boolean> {
  if (!eventRecipeLineId) {
    return true;
  }

  const lineRows = (await sql`
    SELECT id, company_id, event_id
    FROM event_recipe_lines
    WHERE id::text = ${eventRecipeLineId}
      AND event_id::text = ${eventId}
      AND company_id::text = ${companyId}
    LIMIT 1;
  `) as unknown as EventRecipeLineRow[];

  return lineRows.length > 0;
}

function mapLog(row: KitchenPacketLogRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    company_id: row.company_id,
    eventId: row.event_id,
    event_id: row.event_id,
    eventRecipeLineId: row.event_recipe_line_id,
    event_recipe_line_id: row.event_recipe_line_id,
    checklistType: row.checklist_type,
    checklist_type: row.checklist_type,
    itemName: row.item_name,
    item_name: row.item_name,
    status: row.status,
    foodType: row.food_type,
    food_type: row.food_type,
    kitchenTemp: row.kitchen_temp,
    kitchen_temp: row.kitchen_temp,
    loadingTemp: row.loading_temp,
    loading_temp: row.loading_temp,
    deliveryTemp: row.delivery_temp,
    delivery_temp: row.delivery_temp,
    checkedBy: row.checked_by,
    checked_by: row.checked_by,
    checkedAt: row.checked_at,
    checked_at: row.checked_at,
    notes: row.notes,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;
    const checklistType = request.nextUrl.searchParams.get("checklistType");

    await ensureKitchenPacketLogsTable();

    const hasAccess = await ensureEventAccess(eventId, currentUser.company_id);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          eventId,
          logs: [],
          data: [],
          error: "Event not found",
        },
        { status: 404 },
      );
    }

    const logs =
      checklistType && isChecklistType(checklistType)
        ? await sql`
            SELECT
              id,
              company_id,
              event_id,
              event_recipe_line_id,
              checklist_type,
              item_name,
              status,
              food_type,
              kitchen_temp,
              loading_temp,
              delivery_temp,
              checked_by,
              checked_at::text AS checked_at,
              notes,
              created_at::text AS created_at,
              updated_at::text AS updated_at
            FROM kitchen_packet_logs
            WHERE event_id::text = ${eventId}
              AND company_id::text = ${currentUser.company_id}
              AND checklist_type = ${checklistType}
            ORDER BY created_at ASC;
          `
        : await sql`
            SELECT
              id,
              company_id,
              event_id,
              event_recipe_line_id,
              checklist_type,
              item_name,
              status,
              food_type,
              kitchen_temp,
              loading_temp,
              delivery_temp,
              checked_by,
              checked_at::text AS checked_at,
              notes,
              created_at::text AS created_at,
              updated_at::text AS updated_at
            FROM kitchen_packet_logs
            WHERE event_id::text = ${eventId}
              AND company_id::text = ${currentUser.company_id}
            ORDER BY created_at ASC;
          `;

    const mappedLogs = (logs as unknown as KitchenPacketLogRow[]).map(mapLog);

    return NextResponse.json({
      success: true,
      eventId,
      logs: mappedLogs,
      data: mappedLogs,
    });
  } catch (error: unknown) {
    console.error("GET kitchen packet logs error:", error);

    return NextResponse.json(
      {
        success: false,
        logs: [],
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
    const currentUser = await getSafeCurrentUser();
    const { eventId } = await context.params;
    const body = await readJsonBody<KitchenPacketLogBody>(request);

    await ensureKitchenPacketLogsTable();

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

    const checklistType = cleanString(
      body.checklistType ?? body.checklist_type,
    );
    const itemName = cleanString(body.itemName ?? body.item_name);
    const status = cleanString(body.status) || "PENDING";
    const foodType = cleanNullableString(body.foodType ?? body.food_type);
    const kitchenTemp = cleanNullableString(
      body.kitchenTemp ?? body.kitchen_temp,
    );
    const loadingTemp = cleanNullableString(
      body.loadingTemp ?? body.loading_temp,
    );
    const deliveryTemp = cleanNullableString(
      body.deliveryTemp ?? body.delivery_temp,
    );
    const checkedBy =
      cleanNullableString(body.checkedBy ?? body.checked_by) ??
      currentUser.email;
    const notes = cleanNullableString(body.notes);
    const eventRecipeLineId = cleanNullableString(
      body.eventRecipeLineId ?? body.event_recipe_line_id,
    );

    if (!isChecklistType(checklistType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid checklistType",
        },
        { status: 400 },
      );
    }

    if (!itemName) {
      return NextResponse.json(
        {
          success: false,
          error: "itemName is required",
        },
        { status: 400 },
      );
    }

    if (!isLogStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status",
        },
        { status: 400 },
      );
    }

    if (foodType !== null && !isFoodType(foodType)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid foodType",
        },
        { status: 400 },
      );
    }

    const hasLineAccess = await ensureEventRecipeLineAccess(
      eventRecipeLineId,
      eventId,
      currentUser.company_id,
    );

    if (!hasLineAccess) {
      return NextResponse.json(
        {
          success: false,
          error: "Event recipe line not found",
        },
        { status: 404 },
      );
    }

    const insertedRows = (await sql`
      INSERT INTO kitchen_packet_logs (
        company_id,
        event_id,
        event_recipe_line_id,
        checklist_type,
        item_name,
        status,
        food_type,
        kitchen_temp,
        loading_temp,
        delivery_temp,
        checked_by,
        checked_at,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        ${currentUser.company_id},
        ${eventId},
        ${eventRecipeLineId},
        ${checklistType},
        ${itemName},
        ${status},
        ${foodType},
        ${kitchenTemp},
        ${loadingTemp},
        ${deliveryTemp},
        ${checkedBy},
        CASE
          WHEN ${status} IN ('CHECKED', 'COMPLETED') THEN NOW()
          ELSE NULL
        END,
        ${notes},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        company_id,
        event_id,
        event_recipe_line_id,
        checklist_type,
        item_name,
        status,
        food_type,
        kitchen_temp,
        loading_temp,
        delivery_temp,
        checked_by,
        checked_at::text AS checked_at,
        notes,
        created_at::text AS created_at,
        updated_at::text AS updated_at;
    `) as unknown as KitchenPacketLogRow[];

    const insertedLog = mapLog(insertedRows[0]);

    return NextResponse.json({
      success: true,
      eventId,
      log: insertedLog,
      data: insertedLog,
    });
  } catch (error: unknown) {
    console.error("POST kitchen packet logs error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: getResponseStatus(error) },
    );
  }
}