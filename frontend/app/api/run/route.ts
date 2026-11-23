
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { createRun } from "@/lib/server/db/queries/run";
import { getAutomationByPublicId } from "@/lib/server/db/queries/automation-service";
import { createExecutionLog } from "@/lib/server/db/queries/logs";
import { executeAutomationRun } from "@/lib/server/pipeline/pipeline-worker";

export const runtime = "nodejs";

const createRunSchema = z.object({
  automationId: z.string().trim().min(1).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parsed = createRunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "A valid automation public ID is required." },
        { status: 400 },
      );
    }

    const automation = await getAutomationByPublicId(
      parsed.data.automationId,
      userId,
    );

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found." },
        { status: 404 },
      );
    }

    const run = await createRun({
      automationId: automation.id,
      userId,
    });

    try {
      await createExecutionLog({
        runId: run.id,
        userId,
        message: "Automation run queued.",
        metadata: {
          automationPublicId: automation.publicId,
        },
      });
    } catch (error) {
      console.error("Failed to create initial run log:", error);
    }

    // Local-development background execution.
    void executeAutomationRun({
      runId: run.id,
      userId,
      url: automation.url,
      instructions: automation.instructions,
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error("Failed to create run:", error);

    return NextResponse.json(
      { error: "Failed to create the run." },
      { status: 500 },
    );
  }
}
