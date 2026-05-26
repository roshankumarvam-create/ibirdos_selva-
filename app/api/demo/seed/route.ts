import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/app/lib/currentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type CurrentUser = {
  id?: string;
  email?: string;
  role?: string;
  company_id?: string;
  companyId?: string;
};

type SqlValue = string | number | Date | null;

type ColumnRow = {
  column_name: string;
};

type IdRow = {
  id: string;
};

type SeedResult = {
  invoiceId: string | null;
  eventId: string | null;
  recipeIds: string[];
  ingredientIds: string[];
  alertId: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Demo seed failed";
}

function quoteIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }

  return `"${value}"`;
}

async function getCompanyId(): Promise<string> {
  const currentUser = (await getCurrentUser()) as CurrentUser | null;
  const companyId = currentUser?.company_id ?? currentUser?.companyId ?? "";
  const role = currentUser?.role ?? "";

  if (!companyId) {
    throw new Error("Unauthorized: missing company_id");
  }

  if (!["OWNER", "ADMIN", "MANAGER"].includes(role.toUpperCase())) {
    throw new Error("Only owner/admin/manager can seed demo data");
  }

  return companyId;
}

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ) AS exists
  `;

  return rows[0]?.exists === true;
}

async function getColumns(tableName: string): Promise<Set<string>> {
  const rows = await sql<ColumnRow[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = ${tableName}
  `;

  return new Set(rows.map((row) => row.column_name));
}

async function insertRow(
  tableName: string,
  data: Record<string, SqlValue>,
): Promise<string | null> {
  const exists = await tableExists(tableName);

  if (!exists) {
    return null;
  }

  const columns = await getColumns(tableName);
  const entries = Object.entries(data).filter(([column, value]) => {
    return columns.has(column) && value !== undefined;
  });

  if (entries.length === 0) {
    return null;
  }

  const columnSql = entries.map(([column]) => quoteIdentifier(column)).join(", ");
  const valueSql = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);
  const query = `
    INSERT INTO ${quoteIdentifier(tableName)} (${columnSql})
    VALUES (${valueSql})
    RETURNING id::text
  `;

  const rows = (await sql.unsafe(query, values)) as IdRow[];

  return rows[0]?.id ?? null;
}

async function seedIngredients(companyId: string): Promise<string[]> {
  const rows = [
    {
      name: "Salmon Filet",
      category: "Protein",
      unit: "lb",
      latest_cost: 11.25,
      unit_cost: 11.25,
      current_cost: 11.25,
    },
    {
      name: "Brioche Slider Bun",
      category: "Bakery",
      unit: "each",
      latest_cost: 0.45,
      unit_cost: 0.45,
      current_cost: 0.45,
    },
    {
      name: "Spring Mix",
      category: "Produce",
      unit: "lb",
      latest_cost: 3.5,
      unit_cost: 3.5,
      current_cost: 3.5,
    },
    {
      name: "Chicken Breast",
      category: "Protein",
      unit: "lb",
      latest_cost: 4.25,
      unit_cost: 4.25,
      current_cost: 4.25,
    },
    {
      name: "Green Goddess Dressing",
      category: "Sauce",
      unit: "floz",
      latest_cost: 0.09,
      unit_cost: 0.09,
      current_cost: 0.09,
    },
  ];

  const ids: string[] = [];

  for (const row of rows) {
    const id = await insertRow("ingredients", {
      id: randomUUID(),
      company_id: companyId,
      name: row.name,
      ingredient_name: row.name,
      category: row.category,
      unit: row.unit,
      latest_cost: row.latest_cost,
      unit_cost: row.unit_cost,
      current_cost: row.current_cost,
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

async function seedRecipes(companyId: string): Promise<string[]> {
  const recipes = [
    {
      name: "Honey Hoisin Salmon Slider",
      category: "Entree",
      servings: 15,
      sellingPrice: 8,
      costPerServing: 1.98,
      totalCost: 29.7,
      marginPercent: 75.25,
      sourceType: "demo_menuworks",
    },
    {
      name: "Spring Veggie Arugula Boursin Salad",
      category: "Entree",
      servings: 25,
      sellingPrice: 10,
      costPerServing: 3.52,
      totalCost: 88,
      marginPercent: 64.8,
      sourceType: "demo_menuworks",
    },
    {
      name: "BBQ Glazed Salmon Mac Bowl",
      category: "Entree",
      servings: 25,
      sellingPrice: 12,
      costPerServing: 4.23,
      totalCost: 105.75,
      marginPercent: 64.75,
      sourceType: "demo_menuworks",
    },
    {
      name: "Chicken Baja Enchilada Soup",
      category: "Soup",
      servings: 160,
      sellingPrice: 5,
      costPerServing: 1.57,
      totalCost: 251.2,
      marginPercent: 68.6,
      sourceType: "demo_menuworks",
    },
  ];

  const ids: string[] = [];

  for (const recipe of recipes) {
    const id = await insertRow("recipes", {
      id: randomUUID(),
      company_id: companyId,
      name: recipe.name,
      recipe_name: recipe.name,
      category: recipe.category,
      servings: recipe.servings,
      selling_price: recipe.sellingPrice,
      price_per_serving: recipe.sellingPrice,
      total_cost: recipe.totalCost,
      total_food_cost: recipe.totalCost,
      cost_per_serving: recipe.costPerServing,
      food_cost_percent: (recipe.costPerServing / recipe.sellingPrice) * 100,
      margin_percent: recipe.marginPercent,
      current_margin_percent: recipe.marginPercent,
      source_type: recipe.sourceType,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    });

    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

async function seedRecipeIngredients(
  companyId: string,
  recipeIds: string[],
  ingredientIds: string[],
): Promise<void> {
  if (recipeIds.length === 0 || ingredientIds.length === 0) {
    return;
  }

  const lines = [
    {
      recipeId: recipeIds[0],
      ingredientId: ingredientIds[0],
      name: "Salmon Filet",
      quantity: 1.875,
      unit: "lb",
      unitCost: 11.25,
    },
    {
      recipeId: recipeIds[0],
      ingredientId: ingredientIds[1],
      name: "Brioche Slider Bun",
      quantity: 15,
      unit: "each",
      unitCost: 0.45,
    },
    {
      recipeId: recipeIds[1] ?? recipeIds[0],
      ingredientId: ingredientIds[2] ?? ingredientIds[0],
      name: "Spring Mix",
      quantity: 4,
      unit: "lb",
      unitCost: 3.5,
    },
    {
      recipeId: recipeIds[2] ?? recipeIds[0],
      ingredientId: ingredientIds[0],
      name: "Salmon Filet",
      quantity: 12,
      unit: "each",
      unitCost: 4.23,
    },
    {
      recipeId: recipeIds[3] ?? recipeIds[0],
      ingredientId: ingredientIds[3] ?? ingredientIds[0],
      name: "Chicken Breast",
      quantity: 10,
      unit: "lb",
      unitCost: 4.25,
    },
  ];

  for (const line of lines) {
    await insertRow("recipe_ingredients", {
      id: randomUUID(),
      company_id: companyId,
      recipe_id: line.recipeId,
      ingredient_id: line.ingredientId,
      ingredient_name: line.name,
      quantity: line.quantity,
      unit: line.unit,
      unit_cost: line.unitCost,
      latest_cost: line.unitCost,
      line_cost: line.quantity * line.unitCost,
      total_cost: line.quantity * line.unitCost,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}

async function seedInvoice(companyId: string): Promise<string | null> {
  const invoiceId = await insertRow("invoices", {
    id: randomUUID(),
    company_id: companyId,
    vendor_name: "Sysco Corporation",
    invoice_number: "DEMO-755217067",
    invoice_date: "2026-05-17",
    total_amount: 1861.25,
    status: "needs_review",
    payment_status: "unpaid",
    created_at: new Date(),
    updated_at: new Date(),
  });

  if (!invoiceId) {
    return null;
  }

  const lines = [
    {
      item: "MISC. AMERICAN ROLAND ROLA",
      quantity: 2,
      unit: "EA",
      unitPrice: 42.31,
      lineTotal: 84.63,
      category: "food_ingredient",
    },
    {
      item: "PAR BAKED ASPIRE BAKERIES LI",
      quantity: 1,
      unit: "unit",
      unitPrice: 45.04,
      lineTotal: 45.04,
      category: "food_ingredient",
    },
    {
      item: "NITRILE FDSRV",
      quantity: 2,
      unit: "unit",
      unitPrice: 42.02,
      lineTotal: 84.03,
      category: "packaging_supplies",
    },
    {
      item: "MEXICAN FD- OLE' MEXICAN FOC",
      quantity: 1,
      unit: "unit",
      unitPrice: 25.42,
      lineTotal: 25.42,
      category: "packaging_supplies",
    },
  ];

  for (const line of lines) {
    await insertRow("invoice_lines", {
      id: randomUUID(),
      company_id: companyId,
      invoice_id: invoiceId,
      item_name: line.item,
      description: line.item,
      quantity: line.quantity,
      unit: line.unit,
      unit_price: line.unitPrice,
      line_total: line.lineTotal,
      category: line.category,
      status: "needs_review",
      raw_ocr_text: "",
      review_note: "Demo invoice line",
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return invoiceId;
}

async function seedEvent(
  companyId: string,
  recipeIds: string[],
): Promise<string | null> {
  const eventId = await insertRow("events", {
    id: randomUUID(),
    company_id: companyId,
    name: "REC Demo Catering Event",
    event_name: "REC Demo Catering Event",
    event_date: "2026-06-01",
    guest_count: 250,
    status: "DRAFT",
    service_type: "Catering",
    revenue: 4500,
    food_cost: 1058.75,
    total_cost: 1058.75,
    margin: 76.47,
    created_at: new Date(),
    updated_at: new Date(),
  });

  if (!eventId || recipeIds.length === 0) {
    return eventId;
  }

  await insertRow("event_recipe_lines", {
    id: randomUUID(),
    company_id: companyId,
    event_id: eventId,
    recipe_id: recipeIds[0],
    recipe_name: "Honey Hoisin Salmon Slider",
    category: "Entree",
    guest_count: 250,
    eater_percentage: 100,
    customer_portions: 250,
    prep_portions: 275,
    portion_size: 1,
    portion_unit: "portion",
    waste_buffer_percent: 10,
    required_food_amount: 275,
    recipe_yield: 15,
    batch_count: 18.33,
    rounded_batch_count: 19,
    kitchen_batches: 19,
    total_cost: 1058.75,
    selling_price: 8,
    quote_price: 4500,
    station: "Hot Station",
    prep_station: "Hot Station",
    prep_status: "In Progress",
    status: "In Progress",
    created_at: new Date(),
    updated_at: new Date(),
  });

  return eventId;
}

async function seedAlertAndPriceHistory(
  companyId: string,
  ingredientIds: string[],
): Promise<string | null> {
  const ingredientId = ingredientIds[0] ?? null;

  if (ingredientId) {
    await insertRow("price_history", {
      id: randomUUID(),
      company_id: companyId,
      ingredient_id: ingredientId,
      ingredient_name: "Salmon Filet",
      old_cost: 10.65,
      new_cost: 11.25,
      change_amount: 0.6,
      change_percent: 5.63,
      source_type: "demo_invoice",
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return insertRow("alerts", {
    id: randomUUID(),
    company_id: companyId,
    title: "Salmon cost increased",
    message:
      "Salmon Filet increased from $10.65 to $11.25. Review catering event margins before final approval.",
    alert_type: "PRICE_INCREASE",
    severity: "warning",
    status: "open",
    ingredient_id: ingredientId,
    ingredient_name: "Salmon Filet",
    old_cost: 10.65,
    new_cost: 11.25,
    change_amount: 0.6,
    change_percent: 5.63,
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function seedDemoData(): Promise<SeedResult> {
  const companyId = await getCompanyId();

  const ingredientIds = await seedIngredients(companyId);
  const recipeIds = await seedRecipes(companyId);

  await seedRecipeIngredients(companyId, recipeIds, ingredientIds);

  const invoiceId = await seedInvoice(companyId);
  const eventId = await seedEvent(companyId, recipeIds);
  const alertId = await seedAlertAndPriceHistory(companyId, ingredientIds);

  return {
    invoiceId,
    eventId,
    recipeIds,
    ingredientIds,
    alertId,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> { // CHANGED
  try {
    const demoSeedEnabled = process.env.DEMO_SEED_ENABLED === "true"; // CHANGED
    const demoSeedKey = process.env.DEMO_SEED_KEY ?? ""; // CHANGED
    const requestUrl = new URL(request.url); // CHANGED
    const incomingKey = requestUrl.searchParams.get("key") ?? ""; // CHANGED

    if (!demoSeedEnabled || !demoSeedKey || incomingKey !== demoSeedKey) { // CHANGED
      return NextResponse.json( // CHANGED
        { success: false, error: "Demo seed is locked." }, // CHANGED
        { status: 403 }, // CHANGED
      ); // CHANGED
    } // CHANGED

    const result = await seedDemoData();

    return NextResponse.json({
      success: true,
      message: "Demo data created for this company.",
      ...result,
      links: {
        invoices: "/invoices",
        invoiceDetail: result.invoiceId ? `/invoices/${result.invoiceId}` : null,
        recipes: "/recipes",
        events: "/events",
        eventDetail: result.eventId ? `/events/${result.eventId}` : null,
        kitchenPacket: result.eventId
          ? `/events/${result.eventId}/kitchen-packet`
          : null,
        dashboard: "/dashboard",
      },
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

export async function POST(request: NextRequest): Promise<NextResponse> { 
  return GET(request); 
}