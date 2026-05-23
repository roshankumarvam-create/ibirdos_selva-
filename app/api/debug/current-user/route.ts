import { NextResponse } from "next/server";
import { getCurrentUser } from "@/app/lib/currentUser";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unknown debug current user error";
}

export async function GET(): Promise<NextResponse> {
  try {
    const currentUser = await getCurrentUser();

    return NextResponse.json({
      success: true,
      currentUser,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}