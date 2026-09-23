import { and, desc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { generationArtifacts, generations } from "@/lib/server/db/schema";
import { deriveCardPalette } from "@/lib/utils/palette";
import { DASHBOARD_LIMITS } from "@/lib/constants/dashboard";
import type { ExtractedSummary, GenerationMode } from "@/lib/types/generation";
import type { DashboardGeneration } from "@/lib/types/dashboard";

const PALETTE_SIZE = 4;

export interface ListUserGenerationsOptions {
  cursor?: string | null;
  limit?: number | null;
}

interface UserGenerationRow {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  mode: string;
  status: string;
  createdAt: Date;
  viewCount: number;
  bookmarkCount: number;
  screenshotAbove: string | null;
  extractedSummary: unknown;
  skillName: string | null;
  skillDescription: string | null;
  skillMd: string | null;
}

export async function listUserGenerations(
  userId: string,
  options: ListUserGenerationsOptions = {}
): Promise<{ items: DashboardGeneration[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = clampLimit(options.limit);
  const cursor = parseCursor(options.cursor);

  const filters = [
    eq(generations.userId, userId),
    isNull(generations.archivedAt),
  ];
  if (cursor) filters.push(lt(generations.createdAt, cursor));

  const rows = await db
    .select({
      id: generations.id,
      sourceUrl: generations.sourceUrl,
      sourceHost: generations.sourceHost,
      mode: generations.mode,
      status: generations.status,
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
    items: trimmed.map(toDashboardGeneration),
    nextCursor,
  };
}

function toDashboardGeneration(row: UserGenerationRow): DashboardGeneration {
  const summary = (row.extractedSummary as ExtractedSummary | null) ?? null;
  const palette = deriveCardPalette(row.skillMd, summary?.colors ?? [], PALETTE_SIZE);
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    sourceHost: row.sourceHost,
    mode: row.mode as GenerationMode,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    viewCount: row.viewCount,
    bookmarkCount: row.bookmarkCount,
    screenshotAbove: row.screenshotAbove,
    skillName: row.skillName,
    skillDescription: row.skillDescription,
    palette,
    favicon: summary?.favicon ?? null,
  };
}

export async function listUserArchivedGenerations(
  userId: string,
  options: ListUserGenerationsOptions = {}
): Promise<{ items: DashboardGeneration[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = clampLimit(options.limit);
  const cursor = parseCursor(options.cursor);

  const filters = [
    eq(generations.userId, userId),
    isNotNull(generations.archivedAt),
  ];
  if (cursor) filters.push(lt(generations.archivedAt, cursor));

  const rows = await db
    .select({
      id: generations.id,
      sourceUrl: generations.sourceUrl,
      sourceHost: generations.sourceHost,
      mode: generations.mode,
      status: generations.status,
      createdAt: generations.createdAt,
      archivedAt: generations.archivedAt,
      viewCount: generations.viewCount,
      bookmarkCount: generations.bookmarkCount,
      screenshotAbove: generationArtifacts.screenshotAbove,
      extractedSummary: generationArtifacts.extractedSummary,
      skillName: generationArtifacts.skillName,
      skillDescription: generationArtifacts.skillDescription,
      skillMd: generationArtifacts.skillMd,
    })
    .from(generations)
    .leftJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(and(...filters))
    .orderBy(desc(generations.archivedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && trimmed.length > 0
      ? trimmed[trimmed.length - 1].archivedAt?.toISOString() ?? null
      : null;

  return {
    items: trimmed.map(toDashboardGeneration),
    nextCursor,
  };
}

export async function countUserGenerations(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generations)
    .where(eq(generations.userId, userId));
  return row?.count ?? 0;
}

function clampLimit(limit: number | null | undefined): number {
  const fallback = DASHBOARD_LIMITS.defaultPageSize;
  if (!limit || Number.isNaN(limit)) return fallback;
  return Math.min(
    Math.max(1, Math.floor(limit)),
    DASHBOARD_LIMITS.maxPageSize
  );
}

function parseCursor(cursor: string | null | undefined): Date | null {
  if (!cursor) return null;
  const date = new Date(cursor);
  return Number.isNaN(date.getTime()) ? null : date;
}
