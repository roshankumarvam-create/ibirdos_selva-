import { cookies } from "next/headers";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

const sql = postgres(databaseUrl, {
  ssl: databaseUrl.includes("localhost") ? false : "require",
});

export type CurrentUser = {
  id: string;
  email: string;
  role: string;
  company_id: string;
};

type UserRow = {
  id: string;
  email: string;
  role: string;
  company_id: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies();

  const sessionEmail =
    cookieStore.get("ibirdos_user_email")?.value ??
    process.env.DEV_USER_EMAIL ??
    "";

  if (!sessionEmail) {
    throw new Error("Not logged in");
  }

  const users = await sql`
    SELECT
      id,
      email,
      role,
      company_id
    FROM users
    WHERE email = ${sessionEmail}
    LIMIT 1
  `;

  const user = users[0] as UserRow | undefined;

  if (!user) {
    throw new Error("User not found in users table");
  }

  if (!user.company_id) {
    throw new Error("User missing company_id");
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
  };
}