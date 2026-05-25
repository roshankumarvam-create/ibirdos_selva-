import { NextRequest, NextResponse } from "next/server";
import { POST as confirmInvoicePost } from "../confirm/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    invoiceId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  return confirmInvoicePost(request, context);
}