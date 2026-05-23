import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type QuickBooksStatusResponse = {
  success: boolean;
  connected: boolean;
  status: string;
  message: string;
};

export async function GET(): Promise<NextResponse<QuickBooksStatusResponse>> {
  return NextResponse.json({
    success: true,
    connected: false,
    status: "not_connected",
    message: "QuickBooks integration is not connected yet.",
  });
}