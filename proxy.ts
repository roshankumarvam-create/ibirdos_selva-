import { NextRequest, NextResponse } from "next/server";

const blockedApiPrefixes = [
  "/api/test",
  "/api/setup",
  "/api/fix-core",
  "/api/demo",
  "/api/debug",
  "/api/reset-auth",
  "/api/quickbooks",
  "/api/outbound",
  "/api/voice-order",
  "/api/seo-manager",
  "/api/twilio",
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isBlockedApiRoute = blockedApiPrefixes.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (isBlockedApiRoute && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        success: false,
        error: "This route is disabled in production.",
      },
      { status: 404 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};