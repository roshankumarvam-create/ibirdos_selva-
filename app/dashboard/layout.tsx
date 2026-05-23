import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { SESSION_COOKIE_NAME_EXPORT, verifyToken } from "../lib/server-auth";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

type UserSubscriptionRow = {
  id: string;
  company_id: string;
  role: string | null;
  subscription_status: string | null;
};

function isSubscriptionAllowed(status: string | null): boolean {
  return status === "active" || status === "trialing" || status === "pilot";
}

function normalizeRole(role: string | null): string {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function shouldUseKitchenDashboard(role: string): boolean {
  return role === "chef" || role === "kitchen_staff" || role === "driver";
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME_EXPORT)?.value;

  if (!token) {
    redirect("/login");
  }

  let session;

  try {
    session = verifyToken(token);
  } catch {
    redirect("/login");
  }

  const users = await sql`
    SELECT
      users.id,
      users.company_id,
      users.role,
      companies.subscription_status
    FROM users
    INNER JOIN companies
      ON companies.id = users.company_id
    WHERE users.id::text = ${session.user_id}
      AND users.company_id::text = ${session.company_id}
    LIMIT 1;
  `;

  const user = users[0] as UserSubscriptionRow | undefined;

  if (!user) {
    redirect("/login");
  }

  if (!isSubscriptionAllowed(user.subscription_status)) {
    redirect("/login?reason=subscription");
  }

  const role = normalizeRole(user.role);

  if (shouldUseKitchenDashboard(role)) {
    redirect("/kitchen");
  }

  return children;
}