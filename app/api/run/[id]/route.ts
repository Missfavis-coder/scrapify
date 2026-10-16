
import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { getRunById } from "@/lib/server/db/queries/run";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
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

    const run = await getRunById(id, userId);

    if (!run) {
      return NextResponse.json(
        { error: "Run not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error("Failed to retrieve run:", error);

    return NextResponse.json(
      { error: "Failed to retrieve the run." },
      { status: 500 },
    );
  }
}
