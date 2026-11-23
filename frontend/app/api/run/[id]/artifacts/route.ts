
import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { getArtifactsByRun } from "@/lib/server/db/queries/artifacts";

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
    const artifacts = await getArtifactsByRun(id, userId);

    if (artifacts === null) {
      return NextResponse.json(
        { error: "Run not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ artifacts });
  } catch (error) {
    console.error("Failed to retrieve run artifacts:", error);

    return NextResponse.json(
      { error: "Failed to retrieve run artifacts." },
      { status: 500 },
    );
  }
}
