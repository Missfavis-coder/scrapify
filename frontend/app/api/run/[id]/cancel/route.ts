
import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { cancelRun } from "@/lib/server/db/queries/run";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const run = await cancelRun(id, userId);

    if (!run) {
      return NextResponse.json(
        {
          error:
            "Run not found or is not currently running.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Cancellation requested.",
      run,
    });
  } catch (error) {
    console.error("Failed to request run cancellation:", error);

    return NextResponse.json(
      { error: "Failed to request cancellation." },
      { status: 500 },
    );
  }
}
