
import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { getArtifactById } from "@/lib/server/db/queries/artifacts";

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
    const artifact = await getArtifactById(id, userId);

    if (!artifact) {
      return NextResponse.json(
        { error: "Artifact not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ artifact });
  } catch (error) {
    console.error("Failed to retrieve artifact:", error);

    return NextResponse.json(
      { error: "Failed to retrieve artifact." },
      { status: 500 },
    );
  }
}
