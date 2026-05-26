import { NextResponse } from "next/server";
import { verifyToken } from "../../lib/server-auth";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const token = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("ibirdos_session="))
    ?.split("=")[1];

  if (!token) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  try {
    const session = verifyToken(token);
    return NextResponse.json({ ok: true, session });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message ?? "Invalid session" }, { status: 401 });
  }
}