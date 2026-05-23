import { NextResponse } from "next/server";
import { verifyToken } from "../../lib/server-auth";

export async function GET(request: Request): Promise<NextResponse> {
  const cookieHeader = request.headers.get("cookie") || "";

  const token = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("ibirdos_session="))
    ?.split("=")[1];

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "Not authenticated",
      },
      { status: 401 },
    );
  }

  try {
    const session = verifyToken(token);

    return NextResponse.json({
      ok: true,
      session,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Invalid session";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 401 },
    );
  }
}