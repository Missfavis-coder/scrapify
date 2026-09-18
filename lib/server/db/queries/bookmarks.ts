import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  bookmarks,
  generationArtifacts,
  generations,
} from "@/lib/server/db/schema";
import { deriveCardPalette } from "@/lib/utils/palette";
import {
  BOOKMARK_ID_LENGTH,
  DASHBOARD_LIMITS,
} from "@/lib/constants/dashboard";
import type {
  ExtractedSummary,
  GenerationMode,
  PublicGenerationCard,
} from "@/lib/types/generation";
import type { BookmarkWithGeneration } from "@/lib/types/dashboard";

const PALETTE_SIZE = 4;

export type BookmarkToggleResult =
  | { kind: "added"; bookmarkId: string }
  | { kind: "removed" }
  | { kind: "generation_not_found" };

export async function toggleBookmark(
  userId: string,
  generationId: string
): Promise<BookmarkToggleResult> {
  const db = getDb();

  const [generation] = await db
    .select({
      isPublic: generations.isPublic,
      status: generations.status,
    })
    .from(generations)
    .where(eq(generations.id, generationId))
    .limit(1);

  if (
    !generation ||
    !generation.isPublic ||
    generation.status !== "done"
  ) {
    return { kind: "generation_not_found" };
  }

  return db.transaction(async (tx) => {
    const id = nanoid(BOOKMARK_ID_LENGTH);
    const [inserted] = await tx
      .insert(bookmarks)
      .values({ id, userId, generationId })
      .onConflictDoNothing({
        target: [bookmarks.userId, bookmarks.generationId],
      })
      .returning({ id: bookmarks.id });

    if (inserted) {
      await tx
        .update(generations)
        .set({ bookmarkCount: sql`${generations.bookmarkCount} + 1` })
        .where(eq(generations.id, generationId));
      return { kind: "added", bookmarkId: inserted.id };
    }

    const removed = await tx
      .delete(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          eq(bookmarks.generationId, generationId)
        )
      )
      .returning({ id: bookmarks.id });

    if (removed.length > 0) {
      await tx
        .update(generations)
        .set({
          bookmarkCount: sql`GREATEST(${generations.bookmarkCount} - 1, 0)`,
        })
        .where(eq(generations.id, generationId));
    }
    return { kind: "removed" };
  });
}

export interface ListBookmarksOptions {
  cursor?: string | null;
  limit?: number | null;
}

interface BookmarkJoinRow {
  bookmarkId: string;
  bookmarkedAt: Date;
  id: string;
  sourceUrl: string;
  sourceHost: string;
  mode: string;
  createdAt: Date;
  viewCount: number;
  bookmarkCount: number;
  screenshotAbove: string | null;
  extractedSummary: unknown;
  skillName: string | null;
  skillDescription: string | null;
  skillMd: string | null;
}

export async function listBookmarks(
  userId: string,
  options: ListBookmarksOptions = {}
): Promise<{ items: BookmarkWithGeneration[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = clampLimit(options.limit);
  const cursor = parseCursor(options.cursor);

  const filters = [eq(bookmarks.userId, userId)];
  if (cursor) filters.push(lt(bookmarks.createdAt, cursor));

  const rows = await db
    .select({
      bookmarkId: bookmarks.id,
      bookmarkedAt: bookmarks.createdAt,
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
    .from(bookmarks)
    .innerJoin(generations, eq(bookmarks.generationId, generations.id))
    .innerJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(and(...filters))
    .orderBy(desc(bookmarks.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && trimmed.length > 0
      ? trimmed[trimmed.length - 1].bookmarkedAt.toISOString()
      : null;

  return {
    items: trimmed.map(toBookmarkWithGeneration),
    nextCursor,
  };
}

export async function getBookmarkSet(
  userId: string,
  generationIds: string[]
): Promise<Set<string>> {
  if (generationIds.length === 0) return new Set();
  const db = getDb();
  const rows = await db
    .select({ generationId: bookmarks.generationId })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        inArray(bookmarks.generationId, generationIds)
      )
    );
  return new Set(rows.map((row) => row.generationId));
}

function toBookmarkWithGeneration(row: BookmarkJoinRow): BookmarkWithGeneration {
  const summary = (row.extractedSummary as ExtractedSummary | null) ?? null;
  const palette = deriveCardPalette(row.skillMd, summary?.colors ?? [], PALETTE_SIZE);
  const generation: PublicGenerationCard = {
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
  return {
    bookmarkId: row.bookmarkId,
    bookmarkedAt: row.bookmarkedAt.toISOString(),
    generation,
  };
}

export async function countUserBookmarks(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));
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
