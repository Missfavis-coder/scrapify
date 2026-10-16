
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/server/auth/session";
import {
  createWorkflow,
  getWorkflowsByUser,
} from "@/lib/server/db/queries/workflows";

export const runtime = "nodejs";

const workflowStepSchema = z.object({
  id: z.string().trim().min(1).max(100),
  action: z.string().trim().min(1).max(100),
  instruction: z.string().trim().min(1).max(2000),
});

const createWorkflowSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).nullable().optional(),
  steps: z.array(workflowStepSchema).max(100).optional(),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const items = await getWorkflowsByUser(userId);

    return NextResponse.json({ workflows: items });
  } catch (error) {
    console.error("Failed to retrieve workflows:", error);

    return NextResponse.json(
      { error: "Failed to retrieve workflows." },
      { status: 500 },
    );
  }
}

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
    const parsed = createWorkflowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid workflow data.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const workflow = await createWorkflow({
      userId,
      ...parsed.data,
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error("Failed to create workflow:", error);

    return NextResponse.json(
      { error: "Failed to create workflow." },
      { status: 500 },
    );
  }
}
