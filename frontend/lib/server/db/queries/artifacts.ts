
import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { artifacts, runs } from "@/lib/server/db/schema";

interface CreateArtifactInput {
  runId: string;
  userId: string;
  type: string;
  name: string;
  content?: Record<string, unknown> | unknown[] | null;
  storageUrl?: string | null;
  itemCount?: number | null;
  isPublic?: boolean;
}

export async function createArtifact(input: CreateArtifactInput) {
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

  if (
    input.itemCount !== undefined &&
    input.itemCount !== null &&
    (!Number.isInteger(input.itemCount) || input.itemCount < 0)
  ) {
    throw new Error("Item count must be a non-negative integer.");
  }

  const [artifact] = await db
    .insert(artifacts)
    .values({
      executionId: input.runId,
      type: input.type,
      name: input.name,
      content: input.content ?? null,
      storageUrl: input.storageUrl ?? null,
      itemCount: input.itemCount ?? null,
      isPublic: input.isPublic ?? false,
    })
    .returning();

  return artifact;
}

export async function getArtifactsByRun(
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
    .from(artifacts)
    .where(eq(artifacts.executionId, runId))
    .orderBy(desc(artifacts.createdAt));
}

export async function getArtifactById(
  artifactId: string,
  userId: string,
) {
  const [artifact] = await db
    .select()
    .from(artifacts)
    .innerJoin(runs, eq(artifacts.executionId, runs.id))
    .where(
      and(
        eq(artifacts.id, artifactId),
        eq(runs.userId, userId),
      ),
    )
    .limit(1);

  return artifact ?? null;
}
