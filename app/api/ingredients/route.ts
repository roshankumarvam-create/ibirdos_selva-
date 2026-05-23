import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Pool, PoolClient } from "pg";
import { getSessionFromRequest } from "../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ColumnRow = {
  column_name: string;
};

type IngredientRow = {
  id: string;
  name: string;
  unit: string | null;
  latest_cost: string | number | null;
  created_at: Date | string | null;
};

type InsertedIngredientRow = {
  id: string;
  name: string;
  unit: string | null;
  latest_cost: string | number | null;
};

type DbValue = string | number | Date | null;

const databaseUrl = process.env.DATABASE_URL ?? "";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    databaseUrl.length > 0 && !databaseUrl.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is missing" },
      { status: 500 },
    );
  }

  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Not logged in" },
      { status: 401 },
    );
  }

  let client: PoolClient | null = null;

  try {
    client = await pool.connect();

    const columns = await getColumns(client, "ingredients");

    const costSql = columns.has("latest_cost")
      ? "latest_cost"
      : columns.has("unit_cost")
        ? "unit_cost"
        : columns.has("cost_per_unit")
          ? "cost_per_unit"
          : "0";

    const unitSql = columns.has("unit") ? "unit" : "NULL";
    const createdAtSql = columns.has("created_at") ? "created_at" : "NULL";

    const result = await client.query<IngredientRow>(
      `
        SELECT
          id,
          name,
          ${unitSql} AS unit,
          ${costSql} AS latest_cost,
          ${createdAtSql} AS created_at
        FROM ingredients
        WHERE company_id = $1
        ORDER BY name ASC
      `,
      [session.company_id],
    );

    return NextResponse.json({
      success: true,
      ingredients: result.rows.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        latestCost:
          ingredient.latest_cost === null ? 0 : Number(ingredient.latest_cost),
        createdAt: ingredient.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to load ingredients",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { success: false, error: "DATABASE_URL is missing" },
      { status: 500 },
    );
  }

  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Not logged in" },
      { status: 401 },
    );
  }

  let client: PoolClient | null = null;

  try {
    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid ingredient body" },
        { status: 400 },
      );
    }

    const name = getString(body.name);
    const unit = getString(body.unit) ?? "each";
    const latestCost =
      getNumber(body.latestCost) ??
      getNumber(body.latest_cost) ??
      getNumber(body.unitCost) ??
      getNumber(body.unit_cost) ??
      0;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Ingredient name is required" },
        { status: 400 },
      );
    }

    client = await pool.connect();

    const inserted = await insertIngredient(client, {
      id: randomUUID(),
      company_id: session.company_id,
      name,
      unit,
      latest_cost: latestCost,
      unit_cost: latestCost,
      cost_per_unit: latestCost,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      ingredient: {
        id: inserted.id,
        name: inserted.name,
        unit: inserted.unit,
        latestCost:
          inserted.latest_cost === null ? 0 : Number(inserted.latest_cost),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create ingredient",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

async function insertIngredient(
  client: PoolClient,
  data: Record<string, DbValue>,
): Promise<InsertedIngredientRow> {
  const columns = await getColumns(client, "ingredients");
  const entries = Object.entries(data).filter(([column]) =>
    columns.has(column),
  );

  const columnSql = entries.map(([column]) => `"${column}"`).join(", ");
  const valueSql = entries.map((_, index) => `$${index + 1}`).join(", ");
  const values = entries.map(([, value]) => value);

  const result = await client.query<InsertedIngredientRow>(
    `
      INSERT INTO ingredients (${columnSql})
      VALUES (${valueSql})
      RETURNING
        id,
        name,
        ${columns.has("unit") ? "unit" : "NULL"} AS unit,
        ${
          columns.has("latest_cost")
            ? "latest_cost"
            : columns.has("unit_cost")
              ? "unit_cost"
              : columns.has("cost_per_unit")
                ? "cost_per_unit"
                : "0"
        } AS latest_cost
    `,
    values,
  );

  const inserted = result.rows[0];

  if (!inserted) {
    throw new Error("Ingredient was not created.");
  }

  return inserted;
}

async function getColumns(
  client: PoolClient,
  tableName: string,
): Promise<Set<string>> {
  const result = await client.query<ColumnRow>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName],
  );

  return new Set(result.rows.map((row) => row.column_name));
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,%]/g, ""));

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}