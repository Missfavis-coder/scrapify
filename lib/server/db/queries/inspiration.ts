import { and, desc, eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  generationArtifacts,
  generations,
  type GenerationRow,
} from "@/lib/server/db/schema";
import { countUserEventsSince } from "@/lib/server/db/queries/usage-events";
import { deriveCardPalette } from "@/lib/utils/palette";
import { TRACKED_EVENTS } from "@/lib/constants/billing";
import { DASHBOARD_LIMITS } from "@/lib/constants/dashboard";
import type {
  ExtractedDataSnapshot,
  ExtractedSummary,
  GenerationMode,
  GenerationStatus,
  SourceKind,
} from "@/lib/types/generation";
import type { InspirationCard, InspirationSource } from "@/lib/types/inspiration";

const PALETTE_SIZE = 4;

const INSPIRATION_ID_LENGTH = 21;

interface CreateInspirationGenerationInput {
  userId: string;
  sourceKind: SourceKind;
  sourceUrl: string;
  sourceHost: string;
  mode: GenerationMode;
  inspirationImageKey?: string;
  inspirationParentIds?: string[];
  ipHash: string;
}

export async function createInspirationGeneration(
  input: CreateInspirationGenerationInput
): Promise<GenerationRow> {
  const db = getDb();
  const [row] = await db
    .insert(generations)
    .values({
      id: nanoid(INSPIRATION_ID_LENGTH),
      userId: input.userId,
      sourceKind: input.sourceKind,
      sourceUrl: input.sourceUrl,
      sourceHost: input.sourceHost,
      mode: input.mode,
      ipHash: input.ipHash,
      status: "pending",
      isPublic: false,
      isInspiration: true,
      inspirationImageKey: input.inspirationImageKey ?? null,
      inspirationParentIds: input.inspirationParentIds ?? null,
    })
    .returning();
  return row;
}

export async function seedInspirationMetaTitle(
  generationId: string,
  pageTitle: string
): Promise<void> {
  if (!pageTitle.trim()) return;
  const db = getDb();
  await db
    .insert(generationArtifacts)
    .values({
      generationId,
      extractedData: { metaTitle: pageTitle.trim() } as ExtractedDataSnapshot,
      extractedSummary: { metaTitle: pageTitle.trim() } as ExtractedSummary,
    })
    .onConflictDoNothing({ target: generationArtifacts.generationId });
}

export interface ListInspirationsOptions {
  cursor?: string | null;
  limit?: number | null;
}

export async function listInspirationsByUser(
  userId: string,
  options: ListInspirationsOptions = {}
): Promise<{ items: GenerationRow[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = clampLimit(options.limit);
  const cursor = parseCursor(options.cursor);

  const filters = [
    eq(generations.userId, userId),
    eq(generations.isInspiration, true),
  ];
  if (cursor) filters.push(lt(generations.createdAt, cursor));

  const rows = await db
    .select()
    .from(generations)
    .where(and(...filters))
    .orderBy(desc(generations.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && trimmed.length > 0
      ? trimmed[trimmed.length - 1].createdAt.toISOString()
      : null;

  return { items: trimmed, nextCursor };
}

interface InspirationCardRow {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  sourceKind: string;
  mode: string;
  status: string;
  createdAt: Date;
  inspirationParentIds: string[] | null;
  screenshotAbove: string | null;
  extractedSummary: unknown;
  skillName: string | null;
  skillDescription: string | null;
  skillMd: string | null;
}

const SUPPORTED_INSPIRATION_SOURCES: ReadonlySet<InspirationSource> = new Set([
  "image",
  "dribbble",
  "pinterest",
  "figma",
  "merge",
]);

function toInspirationSource(value: string): InspirationSource {
  if ((SUPPORTED_INSPIRATION_SOURCES as ReadonlySet<string>).has(value)) {
    return value as InspirationSource;
  }
  return "image";
}

function toInspirationCard(row: InspirationCardRow): InspirationCard {
  const summary = (row.extractedSummary as ExtractedSummary | null) ?? null;
  const palette = deriveCardPalette(row.skillMd, summary?.colors ?? [], PALETTE_SIZE);
  return {
    id: row.id,
    sourceKind: toInspirationSource(row.sourceKind),
    sourceUrl: row.sourceUrl,
    sourceHost: row.sourceHost,
    mode: row.mode as GenerationMode,
    status: row.status as GenerationStatus,
    createdAt: row.createdAt.toISOString(),
    screenshotAbove: row.screenshotAbove,
    skillName: row.skillName,
    skillDescription: row.skillDescription,
    palette,
    inspirationParentIds: row.inspirationParentIds,
  };
}

export async function listInspirationCardsByUser(
  userId: string,
  options: ListInspirationsOptions = {}
): Promise<{ items: InspirationCard[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = clampLimit(options.limit);
  const cursor = parseCursor(options.cursor);

  const filters = [
    eq(generations.userId, userId),
    eq(generations.isInspiration, true),
  ];
  if (cursor) filters.push(lt(generations.createdAt, cursor));

  const rows = await db
    .select({
      id: generations.id,
      sourceUrl: generations.sourceUrl,
      sourceHost: generations.sourceHost,
      sourceKind: generations.sourceKind,
      mode: generations.mode,
      status: generations.status,
      createdAt: generations.createdAt,
      inspirationParentIds: generations.inspirationParentIds,
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

  return { items: trimmed.map(toInspirationCard), nextCursor };
}

export async function getInspirationCardById(
  id: string,
  userId: string
): Promise<InspirationCard | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: generations.id,
      sourceUrl: generations.sourceUrl,
      sourceHost: generations.sourceHost,
      sourceKind: generations.sourceKind,
      mode: generations.mode,
      status: generations.status,
      createdAt: generations.createdAt,
      inspirationParentIds: generations.inspirationParentIds,
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
    .where(
      and(
        eq(generations.id, id),
        eq(generations.userId, userId),
        eq(generations.isInspiration, true)
      )
    )
    .limit(1);

  if (!row) return null;
  return toInspirationCard(row);
}

export async function getInspirationById(
  id: string,
  userId: string
): Promise<GenerationRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.id, id),
        eq(generations.userId, userId),
        eq(generations.isInspiration, true)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function countInspirationsThisMonth(
  userId: string
): Promise<number> {
  return countUserEventsSince(
    userId,
    TRACKED_EVENTS.inspirationCreated,
    startOfMonthUtc()
  );
}

function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
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
