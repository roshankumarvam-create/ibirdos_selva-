import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { Pool, PoolClient } from "pg";
import { getSessionFromRequest } from "../../lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaType = "prep_photo" | "plating_photo" | "thumbnail" | "video_link";

type MediaProvider = "upload" | "youtube" | "vimeo" | "drive" | "external";

type RecipeMediaRow = {
  id: string;
  recipe_id: string;
  media_type: MediaType;
  title: string | null;
  url: string;
  provider: MediaProvider;
  sort_order: number;
  created_at: Date | string;
};

type RecipeMediaInput = {
  recipeId: string;
  mediaType: MediaType;
  title: string | null;
  url: string;
  provider: MediaProvider;
  sortOrder: number;
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
    const recipeId = request.nextUrl.searchParams.get("recipeId");

    client = await pool.connect();

    const result = await client.query<RecipeMediaRow>(
      `
        SELECT
          id,
          recipe_id,
          media_type,
          title,
          url,
          provider,
          sort_order,
          created_at
        FROM recipe_media
        WHERE company_id = $1
          AND ($2::uuid IS NULL OR recipe_id = $2::uuid)
        ORDER BY sort_order ASC, created_at ASC
      `,
      [session.company_id, recipeId],
    );

    return NextResponse.json({
      success: true,
      media: result.rows.map((row) => ({
        id: row.id,
        recipeId: row.recipe_id,
        mediaType: row.media_type,
        title: row.title,
        url: row.url,
        provider: row.provider,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to load recipe media",
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
  let transactionStarted = false;

  try {
    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid recipe media body" },
        { status: 400 },
      );
    }

    const mediaItems = parseMediaItems(body);

    if (mediaItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid recipe media found" },
        { status: 400 },
      );
    }

    client = await pool.connect();
    await client.query("BEGIN");
    transactionStarted = true;

    const createdMedia: RecipeMediaRow[] = [];

    for (const media of mediaItems) {
      await verifyRecipeAccess(client, {
        companyId: session.company_id,
        recipeId: media.recipeId,
      });

      const result = await client.query<RecipeMediaRow>(
        `
          INSERT INTO recipe_media (
            id,
            company_id,
            recipe_id,
            media_type,
            title,
            url,
            provider,
            sort_order,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING
            id,
            recipe_id,
            media_type,
            title,
            url,
            provider,
            sort_order,
            created_at
        `,
        [
          randomUUID(),
          session.company_id,
          media.recipeId,
          media.mediaType,
          media.title,
          media.url,
          media.provider,
          media.sortOrder,
        ],
      );

      if (result.rows[0]) {
        createdMedia.push(result.rows[0]);
      }
    }

    await client.query("COMMIT");
    transactionStarted = false;

    return NextResponse.json({
      success: true,
      media: createdMedia.map((row) => ({
        id: row.id,
        recipeId: row.recipe_id,
        mediaType: row.media_type,
        title: row.title,
        url: row.url,
        provider: row.provider,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    if (transactionStarted) {
      await client?.query("ROLLBACK").catch(() => undefined);
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to save recipe media",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}

async function verifyRecipeAccess(
  client: PoolClient,
  input: {
    companyId: string;
    recipeId: string;
  },
): Promise<void> {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM recipes
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
    `,
    [input.recipeId, input.companyId],
  );

  if (!result.rows[0]) {
    throw new Error("Recipe not found for this company.");
  }
}

function parseMediaItems(body: Record<string, unknown>): RecipeMediaInput[] {
  const rawItems = Array.isArray(body.media) ? body.media : [body];

  return rawItems
    .map((item, index): RecipeMediaInput | null => {
      if (!isRecord(item)) {
        return null;
      }

      const recipeId = getString(item.recipeId) ?? getString(item.recipe_id);
      const mediaType = parseMediaType(
        getString(item.mediaType) ?? getString(item.media_type),
      );
      const title = getString(item.title);
      const url = getString(item.url);
      const provider =
        parseMediaProvider(getString(item.provider)) ??
        detectProviderFromUrl(url);
      const sortOrder = getNumber(item.sortOrder) ?? getNumber(item.sort_order) ?? index;

      if (!recipeId || !mediaType || !url) {
        return null;
      }

      return {
        recipeId,
        mediaType,
        title,
        url,
        provider,
        sortOrder,
      };
    })
    .filter((item): item is RecipeMediaInput => item !== null);
}

function parseMediaType(value: string | null): MediaType | null {
  if (
    value === "prep_photo" ||
    value === "plating_photo" ||
    value === "thumbnail" ||
    value === "video_link"
  ) {
    return value;
  }

  return null;
}

function parseMediaProvider(value: string | null): MediaProvider | null {
  if (
    value === "upload" ||
    value === "youtube" ||
    value === "vimeo" ||
    value === "drive" ||
    value === "external"
  ) {
    return value;
  }

  return null;
}

function detectProviderFromUrl(url: string | null): MediaProvider {
  if (!url) {
    return "external";
  }

  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
    return "youtube";
  }

  if (lowerUrl.includes("vimeo.com")) {
    return "vimeo";
  }

  if (lowerUrl.includes("drive.google.com")) {
    return "drive";
  }

  return "external";
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
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}