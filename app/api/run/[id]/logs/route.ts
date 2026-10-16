
import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { getExecutionLogs } from "@/lib/server/db/queries/logs";

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
    const logs = await getExecutionLogs(id, userId);

    if (logs === null) {
      return NextResponse.json(
        { error: "Run not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to retrieve execution logs:", error);

    return NextResponse.json(
      { error: "Failed to retrieve execution logs." },
      { status: 500 },
    );
  }
}
