import { eq } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { generations, generationArtifacts } from "@/lib/server/db/schema";

export interface RedactionTarget {
  generationId: string;
  screenshotAbove: string | null;
  screenshotFull: string | null;
  extractedDataUrl: string | null;
}

export async function listGenerationsForRedactionByUrl(
  sourceUrl: string
): Promise<RedactionTarget[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: generations.id,
      screenshotAbove: generationArtifacts.screenshotAbove,
      screenshotFull: generationArtifacts.screenshotFull,
      extractedDataUrl: generationArtifacts.extractedDataUrl,
    })
    .from(generations)
    .leftJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(eq(generations.sourceUrl, sourceUrl));

  return rows.map((row) => ({
    generationId: row.id,
    screenshotAbove: row.screenshotAbove,
    screenshotFull: row.screenshotFull,
    extractedDataUrl: row.extractedDataUrl,
  }));
}

export async function redactGeneration(generationId: string): Promise<void> {
  const db = getDb();
  await db
    .update(generations)
    .set({ isPublic: false, updatedAt: new Date() })
    .where(eq(generations.id, generationId));

  await db
    .update(generationArtifacts)
    .set({
      skillMd: null,
      skillName: null,
      skillDescription: null,
      screenshotAbove: null,
      screenshotFull: null,
      extractedData: null,
      extractedDataUrl: null,
      extractedSummary: null,
    })
    .where(eq(generationArtifacts.generationId, generationId));
}
