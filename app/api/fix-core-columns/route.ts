import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FixCoreColumnsResponse = {
  success: boolean;
  status: string;
  message: string;
};

export async function GET(): Promise<NextResponse<FixCoreColumnsResponse>> {
  return NextResponse.json({
    success: true,
    status: "disabled",
    message: "Fix core columns API route is disabled for production build.",
  });
}