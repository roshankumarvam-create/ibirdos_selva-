import { NextResponse } from "next/server";
import { sql } from "../../../lib/db";
import { hashPassword, createAuthToken } from "../../../lib/server-auth";
import { checkRateLimit, RateLimitError } from "../../../lib/rate-limit";
import { validateRequestBody, isValidEmail } from "../../../lib/validation";

export async function POST(request: Request) {
  try {
    // Rate limit signup attempts
    await checkRateLimit(request, {
      interval: 60 * 1000,  // 1 minute
      uniqueTokenPerInterval: 3,  // 3 signup attempts per minute
    });

    const body = await request.json();

    const validation = validateRequestBody(
      body,
      ['email', 'password', 'companyName']  // required fields
    );

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors },
        { status: 400 }
      );
    }

    const { email, password, companyName } = validation.data!;

    // Additional email validation
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email} LIMIT 1
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "User with this email already exists." },
        { status: 409 }
      );
    }

    // Create company
    const companyCode = `COMP-${Date.now()}`;
    const companies = await sql`
      INSERT INTO companies (name, company_code)
      VALUES (${companyName}, ${companyCode})
      RETURNING id, name, company_code
    `;

    const company = companies[0];

    // Create user
    const passwordHash = hashPassword(password);
    const users = await sql`
      INSERT INTO users (email, password_hash, company_id, role)
      VALUES (${email}, ${passwordHash}, ${company.id}, 'OWNER')
      RETURNING id, email, role, company_id
    `;

    const user = users[0];

    // Create auth token
    const token = createAuthToken({
      user_id: user.id,
      email: user.email,
      role: user.role,
      company_id: user.company_id,
    });

    const response = NextResponse.json({
      message: "Account created successfully",
      redirect: "/dashboard"
    });

    response.cookies.set({
      name: "ibirdos_session",
      value: token,
      httpOnly: true,
      maxAge: 60 * 60, // 1 hour
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;

  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}