
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/server/auth/session";
import {
  deleteWorkflow,
  getWorkflowById,
  updateWorkflow,
} from "@/lib/server/db/queries/workflows";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const workflowStepSchema = z.object({
  id: z.string().trim().min(1).max(100),
  action: z.string().trim().min(1).max(100),
  instruction: z.string().trim().min(1).max(2000),
});

const updateWorkflowSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    steps: z.array(workflowStepSchema).max(100).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

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
    const workflow = await getWorkflowById(id, userId);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Failed to retrieve workflow:", error);

    return NextResponse.json(
      { error: "Failed to retrieve workflow." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
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

    const body: unknown = await request.json();
    const parsed = updateWorkflowSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid workflow update.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { id } = await params;
    const workflow = await updateWorkflow(id, userId, parsed.data);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error("Failed to update workflow:", error);

    return NextResponse.json(
      { error: "Failed to update workflow." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    const workflow = await deleteWorkflow(id, userId);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workflow:", error);

    return NextResponse.json(
      { error: "Failed to delete workflow." },
      { status: 500 },
    );
  }
}
