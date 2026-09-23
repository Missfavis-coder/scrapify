import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import {
  bookmarks,
  generationArtifacts,
  generations,
} from "@/lib/server/db/schema";
import { API_V1_PAGE_DEFAULT, API_V1_PAGE_MAX } from "@/lib/constants/api-keys";
import type {
  PaginatedV1Response,
  SkillSummaryV1,
} from "@/lib/types/webhooks";

interface ListSkillsForUserOptions {
  cursor?: string | null;
  limit?: number | null;
}

interface SkillJoinRow {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  mode: string;
  isPublic: boolean;
  isInspiration: boolean;
  createdAt: Date;
  updatedAt: Date;
  skillName: string | null;
  skillDescription: string | null;
}

export async function listSkillsForUser(
  userId: string,
  options: ListSkillsForUserOptions = {}
): Promise<PaginatedV1Response<SkillSummaryV1>> {
  const db = getDb();
  const limit = clampLimit(options.limit);
  const cursor = parseCursor(options.cursor);

  const bookmarkIds = await db
    .select({ generationId: bookmarks.generationId })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));

  const bookmarkedIds = bookmarkIds.map((row) => row.generationId);

  const accessibleClause =
    bookmarkedIds.length > 0
      ? or(
          eq(generations.userId, userId),
          inArray(generations.id, bookmarkedIds)
        )
      : eq(generations.userId, userId);

  const filters = [accessibleClause];
  if (cursor) filters.push(lt(generations.createdAt, cursor));

  const rows = await db
    .select({
      id: generations.id,
      sourceUrl: generations.sourceUrl,
      sourceHost: generations.sourceHost,
      mode: generations.mode,
      isPublic: generations.isPublic,
      isInspiration: generations.isInspiration,
      createdAt: generations.createdAt,
      updatedAt: generations.updatedAt,
      skillName: generationArtifacts.skillName,
      skillDescription: generationArtifacts.skillDescription,
    })
    .from(generations)
    .leftJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(and(...filters))
    .orderBy(desc(generations.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && trimmed.length > 0
      ? trimmed[trimmed.length - 1].createdAt.toISOString()
      : null;

  return {
    items: trimmed.map(toSkillSummary),
    nextCursor,
  };
}

function toSkillSummary(row: SkillJoinRow): SkillSummaryV1 {
  return {
    id: row.id,
    slug: row.skillName,
    sourceUrl: row.sourceUrl,
    sourceHost: row.sourceHost,
    mode: row.mode,
    isPublic: row.isPublic,
    isInspiration: row.isInspiration,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    name: row.skillName,
    description: row.skillDescription,
  };
}

function clampLimit(limit: number | null | undefined): number {
  if (!limit || Number.isNaN(limit)) return API_V1_PAGE_DEFAULT;
  return Math.min(Math.max(1, Math.floor(limit)), API_V1_PAGE_MAX);
}

function parseCursor(cursor: string | null | undefined): Date | null {
  if (!cursor) return null;
  const date = new Date(cursor);
  return Number.isNaN(date.getTime()) ? null : date;
}
