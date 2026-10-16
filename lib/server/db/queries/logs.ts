
import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { executionLogs, runs } from "@/lib/server/db/schema";

export type LogLevel = "info" | "warn" | "error";

interface CreateExecutionLogInput {
  runId: string;
  userId: string;
  level?: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

export async function createExecutionLog(
  input: CreateExecutionLogInput,
) {
  const [run] = await db
    .select({ id: runs.id })
    .from(runs)
    .where(
      and(
        eq(runs.id, input.runId),
        eq(runs.userId, input.userId),
      ),
    )
    .limit(1);

  if (!run) {
    throw new Error("Run not found.");
  }

  const [log] = await db
    .insert(executionLogs)
    .values({
      executionId: input.runId,
      level: input.level ?? "info",
      message: input.message,
      metadata: input.metadata,
    })
    .returning();

  return log;
}

export async function getExecutionLogs(
  runId: string,
  userId: string,
) {
  const [run] = await db
    .select({ id: runs.id })
    .from(runs)
    .where(
      and(
        eq(runs.id, runId),
        eq(runs.userId, userId),
      ),
    )
    .limit(1);

  if (!run) {
    return null;
  }

  return db
    .select()
    .from(executionLogs)
    .where(eq(executionLogs.executionId, runId))
    .orderBy(asc(executionLogs.createdAt));
}
