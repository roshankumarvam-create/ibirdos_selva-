import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME_EXPORT } from "@/app/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({
    success: true,
    ok: true,
    message: "Logged out",
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME_EXPORT,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function GET(): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/login", "http://localhost:3000"));

  response.cookies.set({
    name: SESSION_COOKIE_NAME_EXPORT,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}