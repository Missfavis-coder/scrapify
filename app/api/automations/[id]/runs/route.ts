
import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { getAutomationByPublicId } from "@/lib/server/db/queries/automation-service";
import { getRunsByAutomation } from "@/lib/server/db/queries/run";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const { id: publicId } = await params;

    console.log(`[Runs:${requestId}] History request started`, {
      publicId,
    });

    // 1. Authenticate the current user.
    const userId = await getCurrentUserId();

    if (!userId) {
      console.warn(`[Runs:${requestId}] Authentication required`);

      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    console.log(`[Runs:${requestId}] User authenticated`);

    // 2. Find the automation using its public ID.
    const automation = await getAutomationByPublicId(
      publicId,
      userId,
    );

    if (!automation) {
      console.warn(`[Runs:${requestId}] Automation not found`, {
        publicId,
      });

      return NextResponse.json(
        { error: "Automation not found." },
        { status: 404 },
      );
    }

    console.log(`[Runs:${requestId}] Automation found`, {
      automationId: automation.id,
    });

    // 3. Retrieve runs using the internal automation UUID.
    const runs = await getRunsByAutomation(
      automation.id,
      userId,
    );

    console.log(`[Runs:${requestId}] History retrieved`, {
      count: runs.length,
      statuses: runs.map((run) => run.status),
    });

    // 4. Return the response expected by automationService.getRuns().
    return NextResponse.json({ runs });
  } catch (error) {
    console.error(
      `[Runs:${requestId}] Failed to retrieve execution history`,
      error,
    );

    return NextResponse.json(
      { error: "Failed to retrieve execution history." },
      { status: 500 },
    );
  }
}
