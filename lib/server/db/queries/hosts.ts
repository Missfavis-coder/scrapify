import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { generations, generationArtifacts } from "@/lib/server/db/schema";
import type {
  ExtractedSummary,
  GenerationMode,
  PublicGenerationCard,
} from "@/lib/types/generation";
import { deriveCardPalette } from "@/lib/utils/palette";

const PALETTE_SIZE = 4;
const HOST_PAGE_LIMIT = 60;
const STATIC_HOSTS_LIMIT = 200;

export async function listTopPublicHostNames(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({
      host: generations.sourceHost,
      count: sql<number>`count(*)::int`,
    })
    .from(generations)
    .where(
      and(
        eq(generations.isPublic, true),
        eq(generations.status, "done"),
        eq(generations.isInspiration, false)
      )
    )
    .groupBy(generations.sourceHost)
    .orderBy(desc(sql`count(*)`))
    .limit(STATIC_HOSTS_LIMIT);

  return rows.map((row) => row.host).filter((host): host is string => Boolean(host));
}

export async function getPublicGenerationsForHost(
  host: string
): Promise<PublicGenerationCard[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: generations.id,
      sourceUrl: generations.sourceUrl,
      sourceHost: generations.sourceHost,
      mode: generations.mode,
      createdAt: generations.createdAt,
      viewCount: generations.viewCount,
      bookmarkCount: generations.bookmarkCount,
      screenshotAbove: generationArtifacts.screenshotAbove,
      extractedSummary: generationArtifacts.extractedSummary,
      skillName: generationArtifacts.skillName,
      skillDescription: generationArtifacts.skillDescription,
      skillMd: generationArtifacts.skillMd,
    })
    .from(generations)
    .innerJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(
      and(
        eq(generations.isPublic, true),
        eq(generations.status, "done"),
        eq(generations.isInspiration, false),
        eq(generations.sourceHost, host)
      )
    )
    .orderBy(desc(generations.viewCount), desc(generations.createdAt))
    .limit(HOST_PAGE_LIMIT);

  return rows.map((row) => {
    const summary = (row.extractedSummary as ExtractedSummary | null) ?? null;
    const palette = deriveCardPalette(row.skillMd, summary?.colors ?? [], PALETTE_SIZE);
    return {
      id: row.id,
      sourceUrl: row.sourceUrl,
      sourceHost: row.sourceHost,
      mode: row.mode as GenerationMode,
      createdAt: row.createdAt.toISOString(),
      viewCount: row.viewCount,
      bookmarkCount: row.bookmarkCount,
      screenshotAbove: row.screenshotAbove,
      skillName: row.skillName,
      skillDescription: row.skillDescription,
      palette,
      favicon: summary?.favicon ?? null,
    };
  });
}
