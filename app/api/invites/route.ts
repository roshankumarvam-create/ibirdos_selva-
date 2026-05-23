import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { getCurrentUser } from "@/app/lib/currentUser";
import { hashPassword } from "@/app/lib/server-auth";

export const dynamic = "force-dynamic";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type InviteRole = "manager" | "chef" | "kitchen_staff" | "driver";

type InviteBody = {
  fullName?: string;
  email?: string;
  role?: string;
};

type InviteRow = {
  id: string;
  company_id: string;
  email: string | null;
  invited_email: string | null;
  invited_name: string | null;
  role: string;
  status: string;
  temporary_password: string | null;
  created_at: string | null;
};

type UserRow = {
  id: string;
  email: string;
  role: string;
  company_id: string;
  full_name: string | null;
  created_at: string | null;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    return JSON.stringify(error);
  }

  return "Unknown invite error";
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isInviteRole(value: string): value is InviteRole {
  return ["manager", "chef", "kitchen_staff", "driver"].includes(value);
}

function canInvite(role: string): boolean {
  const normalizedRole = role.trim().toLowerCase();

  return (
    normalizedRole === "admin" ||
    normalizedRole === "owner" ||
    normalizedRole === "manager"
  );
}

async function ensureInviteSchema(): Promise<void> {
  await sql`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID,
      email TEXT,
      invited_email TEXT,
      invited_name TEXT,
      role TEXT,
      status TEXT DEFAULT 'accepted',
      temporary_password TEXT,
      invited_by UUID,
      accepted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    ALTER TABLE invites
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS invited_email TEXT,
    ADD COLUMN IF NOT EXISTS invited_name TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted',
    ADD COLUMN IF NOT EXISTS temporary_password TEXT,
    ADD COLUMN IF NOT EXISTS invited_by UUID,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner',
    ADD COLUMN IF NOT EXISTS company_id UUID,
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_invites_company_id
    ON invites(company_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_invites_email
    ON invites(LOWER(email));
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_invites_invited_email
    ON invites(LOWER(invited_email));
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_company_id
    ON users(company_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(LOWER(email));
  `;
}

function mapInvite(row: InviteRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    invitedEmail: row.invited_email ?? row.email,
    invitedName: row.invited_name,
    role: row.role,
    status: row.status,
    temporaryPassword: row.temporary_password,
    createdAt: row.created_at,
  };
}

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    companyId: row.company_id,
    fullName: row.full_name,
    createdAt: row.created_at,
  };
}

export async function GET(): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();

    if (!canInvite(currentUser.role)) {
      return NextResponse.json(
        {
          success: false,
          invites: [],
          data: [],
          error: "Owner or manager access required",
        },
        { status: 403 },
      );
    }

    await ensureInviteSchema();

    const rows = await sql`
      SELECT
        id,
        company_id,
        email,
        invited_email,
        invited_name,
        role,
        status,
        temporary_password,
        created_at
      FROM invites
      WHERE company_id::text = ${currentUser.company_id}
      ORDER BY created_at DESC NULLS LAST
      LIMIT 100;
    `;

    const invites = (rows as unknown as InviteRow[]).map(mapInvite);

    return NextResponse.json({
      success: true,
      invites,
      data: invites,
    });
  } catch (error: unknown) {
    console.error("GET /api/invites error:", error);

    return NextResponse.json(
      {
        success: false,
        invites: [],
        data: [],
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();

    if (!canInvite(currentUser.role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Owner or manager access required",
        },
        { status: 403 },
      );
    }

    await ensureInviteSchema();

    const body = (await request.json()) as InviteBody;

    const fullName = cleanString(body.fullName);
    const email = normalizeEmail(body.email);
    const role = cleanString(body.role) || "kitchen_staff";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid email is required",
        },
        { status: 400 },
      );
    }

    if (!isInviteRole(role)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid role",
          allowedRoles: ["manager", "chef", "kitchen_staff", "driver"],
        },
        { status: 400 },
      );
    }

    const temporaryPassword = "Welcome123!";
    const passwordHash = hashPassword(temporaryPassword);

    const inviteRows = await sql`
      INSERT INTO invites (
        company_id,
        email,
        invited_email,
        invited_name,
        role,
        status,
        temporary_password,
        invited_by,
        accepted_at,
        created_at,
        updated_at
      )
      VALUES (
        ${currentUser.company_id},
        ${email},
        ${email},
        ${fullName || email},
        ${role},
        'accepted',
        ${temporaryPassword},
        ${currentUser.id},
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING
        id,
        company_id,
        email,
        invited_email,
        invited_name,
        role,
        status,
        temporary_password,
        created_at;
    `;

    await sql`
      UPDATE users
      SET
        full_name = ${fullName || email},
        role = ${role},
        company_id = ${currentUser.company_id},
        password_hash = ${passwordHash},
        must_change_password = true,
        updated_at = NOW()
      WHERE LOWER(email) = LOWER(${email});
    `;

    const existingUserRows = await sql`
      SELECT
        id,
        email,
        role,
        company_id,
        full_name,
        created_at
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      ORDER BY
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST
      LIMIT 1;
    `;

    const userRows =
      existingUserRows.length > 0
        ? existingUserRows
        : await sql`
            INSERT INTO users (
              id,
              email,
              full_name,
              role,
              company_id,
              password_hash,
              must_change_password,
              created_at,
              updated_at
            )
            VALUES (
              gen_random_uuid(),
              ${email},
              ${fullName || email},
              ${role},
              ${currentUser.company_id},
              ${passwordHash},
              true,
              NOW(),
              NOW()
            )
            RETURNING
              id,
              email,
              role,
              company_id,
              full_name,
              created_at;
          `;

    const invite = mapInvite(inviteRows[0] as unknown as InviteRow);
    const user = mapUser(userRows[0] as unknown as UserRow);

    return NextResponse.json({
      success: true,
      invite,
      user,
      temporaryPassword,
      message: "Staff invite created",
    });
  } catch (error: unknown) {
    console.error("POST /api/invites error:", error);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}