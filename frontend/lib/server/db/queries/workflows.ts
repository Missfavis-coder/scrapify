
import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { workflows } from "@/lib/server/db/schema";

export interface WorkflowStep {
  id: string;
  action: string;
  instruction: string;
}

export interface CreateWorkflowInput {
  userId: string;
  name: string;
  description?: string | null;
  steps?: WorkflowStep[];
}

export async function createWorkflow(input: CreateWorkflowInput) {
  const [workflow] = await db
    .insert(workflows)
    .values({
      userId: input.userId,
      name: input.name.trim(),
      description: input.description ?? null,
      steps: input.steps ?? [],
    })
    .returning();

  return workflow;
}

export async function getWorkflowById(
  workflowId: string,
  userId: string,
) {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(
      and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, userId),
      ),
    )
    .limit(1);

  return workflow ?? null;
}

export async function getWorkflowsByUser(userId: string) {
  return db
    .select()
    .from(workflows)
    .where(eq(workflows.userId, userId))
    .orderBy(desc(workflows.createdAt));
}

export async function updateWorkflow(
  workflowId: string,
  userId: string,
  input: {
    name?: string;
    description?: string | null;
    steps?: WorkflowStep[];
  },
) {
  const [workflow] = await db
    .update(workflows)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, userId),
      ),
    )
    .returning();

  return workflow ?? null;
}

export async function deleteWorkflow(
  workflowId: string,
  userId: string,
) {
  const [workflow] = await db
    .delete(workflows)
    .where(
      and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, userId),
      ),
    )
    .returning({ id: workflows.id });

  return workflow ?? null;
}
