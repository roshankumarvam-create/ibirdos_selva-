import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TestSendersResponse = {
  success: boolean;
  status: string;
  message: string;
};

export async function GET(): Promise<NextResponse<TestSendersResponse>> {
  return NextResponse.json({
    success: true,
    status: "disabled",
    message: "Test senders route is disabled for production build.",
  });
}