import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  generationArtifacts,
  generationVersions,
  generations,
  type GenerationRow,
  type GenerationVersionRow,
} from "@/lib/server/db/schema";
import { LIMITS } from "@/lib/constants/limits";
import { uploadVersionSnapshot } from "@/lib/server/storage/extracted-blob";
import type { ExtractedDataSnapshot } from "@/lib/types/generation";

export interface ArchiveVersionInput {
  generationId: string;
  skillMd: string | null;
  skillName: string | null;
  skillDescription: string | null;
  extractedData?: unknown;
}

export async function archiveCurrentVersion(
  input: ArchiveVersionInput
): Promise<GenerationVersionRow | null> {
  if (!input.skillMd) return null;
  return insertVersion(input);
}

export async function insertVersion(
  input: ArchiveVersionInput
): Promise<GenerationVersionRow | null> {
  const db = getDb();
  const [last] = await db
    .select({ versionNumber: generationVersions.versionNumber })
    .from(generationVersions)
    .where(eq(generationVersions.generationId, input.generationId))
    .orderBy(desc(generationVersions.versionNumber))
    .limit(1);
  const nextNumber = (last?.versionNumber ?? 0) + 1;
  const versionId = nanoid(12);
  let extractedDataUrl: string | null = null;
  if (input.extractedData) {
    try {
      extractedDataUrl = await uploadVersionSnapshot(
        versionId,
        input.extractedData as ExtractedDataSnapshot
      );
    } catch {
      extractedDataUrl = null;
    }
  }

  const [row] = await db
    .insert(generationVersions)
    .values({
      id: versionId,
      generationId: input.generationId,
      versionNumber: nextNumber,
      skillMd: input.skillMd,
      skillName: input.skillName,
      skillDescription: input.skillDescription,
      extractedData: null,
      extractedDataUrl,
    })
    .returning();
  return row ?? null;
}

export async function listVersions(
  generationId: string
): Promise<GenerationVersionRow[]> {
  const db = getDb();
  return db
    .select()
    .from(generationVersions)
    .where(eq(generationVersions.generationId, generationId))
    .orderBy(desc(generationVersions.versionNumber));
}

export const getVersionsForGeneration = listVersions;

export async function getLatestVersion(
  generationId: string
): Promise<GenerationVersionRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(generationVersions)
    .where(eq(generationVersions.generationId, generationId))
    .orderBy(desc(generationVersions.versionNumber))
    .limit(1);
  return row ?? null;
}

export const getLatestPreviousVersion = getLatestVersion;

export async function getStalePublicGenerations(input: {
  olderThan: Date;
  limit: number;
}): Promise<GenerationRow[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.isPublic, true),
        eq(generations.status, "done"),
        eq(generations.isInspiration, false),
        lt(generations.updatedAt, input.olderThan)
      )
    )
    .orderBy(generations.updatedAt)
    .limit(input.limit);
  return rows;
}

export async function resetGenerationToPending(id: string): Promise<boolean> {
  const db = getDb();
  const staleCutoff = new Date(Date.now() - LIMITS.runLockWindowMs);
  const [row] = await db
    .update(generations)
    .set({
      status: "pending",
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(generations.id, id),
        or(
          inArray(generations.status, ["done", "failed"]),
          isNull(generations.startedAt),
          lt(generations.startedAt, staleCutoff)
        )
      )
    )
    .returning({ id: generations.id });
  return Boolean(row);
}

export async function restoreArtifactsFromLatestVersion(
  generationId: string
): Promise<{ skillName: string | null; skillDescription: string | null } | null> {
  const version = await getLatestVersion(generationId);
  if (!version || !version.skillMd) return null;

  const db = getDb();
  await db
    .update(generationArtifacts)
    .set({
      skillMd: version.skillMd,
      skillName: version.skillName,
      skillDescription: version.skillDescription,
    })
    .where(eq(generationArtifacts.generationId, generationId));

  return {
    skillName: version.skillName,
    skillDescription: version.skillDescription,
  };
}

export async function setGenerationFeedback(
  id: string,
  feedback: string | null
): Promise<void> {
  const db = getDb();
  await db
    .update(generations)
    .set({ feedback, updatedAt: new Date() })
    .where(eq(generations.id, id));
}
