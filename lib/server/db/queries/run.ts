
import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { runs } from "@/lib/server/db/schema";

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

interface CreateRunInput {
  automationId: string;
  userId: string;
}

interface UpdateRunProgressInput {
  stage: string;
  progress: number;
  currentAction?: string | null;
}

export async function createRun(input: CreateRunInput) {
  const [run] = await db
    .insert(runs)
    .values({
      automationId: input.automationId,
      userId: input.userId,
      status: "queued",
      stage: "queued",
      progress: 0,
    })
    .returning();

  return run;
}

export async function getRunById(runId: string, userId: string) {
  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.userId, userId)))
    .limit(1);

  return run ?? null;
}

export async function getRunsByAutomation(
  automationId: string,
  userId: string,
) {
  return db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.automationId, automationId),
        eq(runs.userId, userId),
      ),
    )
    .orderBy(desc(runs.createdAt));
}

export async function startRun(runId: string, userId: string) {
  const [run] = await db
    .update(runs)
    .set({
      status: "running",
      stage: "starting",
      progress: 0,
      currentAction: "Preparing browser session",
      startedAt: new Date(),
    })
    .where(
      and(
        eq(runs.id, runId),
        eq(runs.userId, userId),
        eq(runs.status, "queued"),
      ),
    )
    .returning();

  return run ?? null;
}

export async function updateRunProgress(
  runId: string,
  userId: string,
  input: UpdateRunProgressInput,
) {
  if (!Number.isInteger(input.progress) || input.progress < 0 || input.progress > 100) {
    throw new Error("Progress must be an integer between 0 and 100.");
  }

  const [run] = await db
    .update(runs)
    .set({
      stage: input.stage,
      progress: input.progress,
      currentAction: input.currentAction ?? null,
    })
    .where(
      and(
        eq(runs.id, runId),
        eq(runs.userId, userId),
        eq(runs.status, "running"),
      ),
    )
    .returning();

  return run ?? null;
}

export async function completeRun(runId: string, userId: string) {
  const [run] = await db
    .update(runs)
    .set({
      status: "completed",
      stage: "completed",
      progress: 100,
      currentAction: null,
      finishedAt: new Date(),
      error: null,
      errorCode: null,
      errorDetail: null,
    })
    .where(
      and(
        eq(runs.id, runId),
        eq(runs.userId, userId),
        eq(runs.status, "running"),
      ),
    )
    .returning();

  return run ?? null;
}

export async function failRun(
  runId: string,
  userId: string,
  input: {
    error: string;
    errorCode?: string;
    errorDetail?: string;
  },
) {
  const [run] = await db
    .update(runs)
    .set({
      status: "failed",
      stage: "failed",
      currentAction: null,
      finishedAt: new Date(),
      error: input.error,
      errorCode: input.errorCode ?? null,
      errorDetail: input.errorDetail ?? null,
    })
    .where(
      and(
        eq(runs.id, runId),
        eq(runs.userId, userId),
        eq(runs.status, "running"),
      ),
    )
    .returning();

  return run ?? null;
}

export async function cancelRun(runId: string, userId: string) {
  const [run] = await db
    .update(runs)
    .set({
      cancelRequestedAt: new Date(),
    })
    .where(
      and(
        eq(runs.id, runId),
        eq(runs.userId, userId),
        eq(runs.status, "running"),
      ),
    )
    .returning();

  return run ?? null;
}
