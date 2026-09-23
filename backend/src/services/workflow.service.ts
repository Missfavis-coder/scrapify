import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { workflows } from "../db/schema.js";
import type { WorkflowGraph } from "../schemas/workflow.schema.js";
import { logger } from "../utils/logger.js";

export interface CreateWorkflowData {
  name: string;
  targetUrl: string;
  taskDescription: string;
  workflowGraph: WorkflowGraph;
}

export async function createWorkflow(data: CreateWorkflowData) {
  logger.info("Creating workflow", { name: data.name, url: data.targetUrl });

  const [workflow] = await db
    .insert(workflows)
    .values({
      name: data.name,
      targetUrl: data.targetUrl,
      taskDescription: data.taskDescription,
      workflowGraph: data.workflowGraph,
    })
    .returning();

  logger.info("Workflow created", { id: workflow.id });
  return workflow;
}

export async function getAllWorkflows() {
  const result = await db
    .select()
    .from(workflows)
    .orderBy(workflows.createdAt);

  return result;
}

export async function getWorkflowById(id: string) {
  const [workflow] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, id));

  return workflow || null;
}

export async function deleteWorkflow(id: string) {
  const [deleted] = await db
    .delete(workflows)
    .where(eq(workflows.id, id))
    .returning();

  return deleted || null;
}
