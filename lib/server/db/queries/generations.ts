import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import {
  generations,
  generationArtifacts,
  generationViews,
  bookmarks,
  type GenerationRow,
  type GenerationArtifactsRow,
} from "@/lib/server/db/schema";
import type {
  GenerationMode,
  GenerationStatus,
  GenerationWithArtifacts,
  ExtractedDataSnapshot,
  ExtractedSummary,
  PublicGenerationCard,
  SourceKind,
} from "@/lib/types/generation";
import type { SkillQuality } from "@/lib/types/skill";
import { LIMITS, RANKING } from "@/lib/constants/limits";
import { FEATURED_VIEW_BOOST } from "@/lib/constants/views";
import { deriveCardPalette } from "@/lib/utils/palette";
import { loadExtractedSnapshot } from "@/lib/server/storage/extracted-blob";

export type ClaimRunOutcome =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_pending" | "already_running" };

const DEFAULT_PUBLIC_LIMIT = 24;
const MAX_PUBLIC_LIMIT = 60;
const PALETTE_SIZE = 4;

interface CreateRowInput {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  mode: GenerationMode;
  ipHash: string;
  cookieKey?: string | null;
  frontend?: boolean;
  userId?: string | null;
  isPublic?: boolean;
}

export async function insertPendingGeneration(input: CreateRowInput): Promise<GenerationRow> {
  const db = getDb();
  const [row] = await db
    .insert(generations)
    .values({
      id: input.id,
      sourceUrl: input.sourceUrl,
      sourceHost: input.sourceHost,
      mode: input.mode,
      ipHash: input.ipHash,
      cookieKey: input.cookieKey ?? null,
      status: "pending",
      frontend: input.frontend ?? false,
      userId: input.userId ?? null,
      ...(input.isPublic === undefined ? {} : { isPublic: input.isPublic }),
    })
    .returning();
  return row;
}

interface FindFrontendSeedInput {
  sourceUrl: string;
  mode: GenerationMode;
}

export async function findFrontendSeedDone(
  input: FindFrontendSeedInput
): Promise<{ id: string } | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: generations.id })
    .from(generations)
    .where(
      and(
        eq(generations.sourceUrl, input.sourceUrl),
        eq(generations.mode, input.mode),
        eq(generations.frontend, true),
        eq(generations.status, "done")
      )
    )
    .limit(1);
  return row ?? null;
}

export async function deleteFailedFrontendSeed(
  input: FindFrontendSeedInput
): Promise<number> {
  const db = getDb();
  const deleted = await db
    .delete(generations)
    .where(
      and(
        eq(generations.sourceUrl, input.sourceUrl),
        eq(generations.mode, input.mode),
        eq(generations.frontend, true),
        eq(generations.status, "failed")
      )
    )
    .returning({ id: generations.id });
  return deleted.length;
}

export interface FailureMeta {
  code?: string | null;
  detail?: string | null;
}

export async function updateGenerationStatus(
  id: string,
  status: GenerationStatus,
  errorMessage?: string,
  failureMeta?: FailureMeta
): Promise<void> {
  const db = getDb();
  await db
    .update(generations)
    .set({
      status,
      updatedAt: new Date(),
      completedAt: status === "done" || status === "failed" ? new Date() : undefined,
      errorMessage: errorMessage ?? null,
      errorCode: failureMeta?.code ?? null,
      errorDetail: failureMeta?.detail ?? null,
    })
    .where(eq(generations.id, id));
}

interface ArtifactInput {
  generationId: string;
  screenshotAbove: string | null;
  screenshotFull: string | null;
  extractedDataUrl: string | null;
  extractedSummary: ExtractedSummary;
}

export async function upsertArtifacts(input: ArtifactInput): Promise<void> {
  const db = getDb();
  await db
    .insert(generationArtifacts)
    .values({
      generationId: input.generationId,
      screenshotAbove: input.screenshotAbove,
      screenshotFull: input.screenshotFull,
      extractedData: null,
      extractedDataUrl: input.extractedDataUrl,
      extractedSummary: input.extractedSummary,
    })
    .onConflictDoUpdate({
      target: generationArtifacts.generationId,
      set: {
        screenshotAbove: input.screenshotAbove,
        screenshotFull: input.screenshotFull,
        extractedData: null,
        extractedDataUrl: input.extractedDataUrl,
        extractedSummary: input.extractedSummary,
      },
    });
}

export async function updateSkillMdProgress(
  generationId: string,
  partial: string
): Promise<void> {
  const db = getDb();
  await db
    .update(generationArtifacts)
    .set({ skillMd: partial })
    .where(eq(generationArtifacts.generationId, generationId));
}

export async function setScreenshotFull(
  generationId: string,
  screenshotFull: string
): Promise<void> {
  const db = getDb();
  await db
    .update(generationArtifacts)
    .set({ screenshotFull })
    .where(eq(generationArtifacts.generationId, generationId));
}

export async function setSkillMd(
  generationId: string,
  skillMd: string,
  name: string,
  description: string
): Promise<void> {
  const db = getDb();
  await db
    .update(generationArtifacts)
    .set({ skillMd, skillName: name, skillDescription: description })
    .where(eq(generationArtifacts.generationId, generationId));
}

export async function setSkillQuality(
  generationId: string,
  quality: SkillQuality
): Promise<void> {
  const db = getDb();
  await db
    .update(generationArtifacts)
    .set({ quality })
    .where(eq(generationArtifacts.generationId, generationId));
}

export async function clearSkillQuality(generationId: string): Promise<void> {
  const db = getDb();
  await db
    .update(generationArtifacts)
    .set({ quality: null })
    .where(eq(generationArtifacts.generationId, generationId));
}

export async function getArtifactsForRegen(
  generationId: string
): Promise<{
  sourceUrl: string;
  sourceHost: string;
  mode: GenerationMode;
  extractedData: ExtractedDataSnapshot;
  screenshotAbove: string | null;
  pageTitle: string;
} | null> {
  const db = getDb();
  const [row] = await db
    .select({
      sourceUrl: generations.sourceUrl,
      sourceHost: generations.sourceHost,
      mode: generations.mode,
      extractedData: generationArtifacts.extractedData,
      extractedDataUrl: generationArtifacts.extractedDataUrl,
      screenshotAbove: generationArtifacts.screenshotAbove,
    })
    .from(generations)
    .innerJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(eq(generations.id, generationId));
  if (!row) return null;
  const data = await loadExtractedSnapshot({
    url: row.extractedDataUrl,
    fallback: (row.extractedData as ExtractedDataSnapshot | null) ?? null,
  });
  return {
    sourceUrl: row.sourceUrl,
    sourceHost: row.sourceHost,
    mode: row.mode as GenerationMode,
    extractedData: data,
    screenshotAbove: row.screenshotAbove,
    pageTitle: data.metaTitle ?? row.sourceHost,
  };
}

export async function claimGenerationRun(id: string): Promise<ClaimRunOutcome> {
  const db = getDb();
  const cutoff = new Date(Date.now() - LIMITS.runLockWindowMs);
  const [claimed] = await db
    .update(generations)
    .set({ startedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(generations.id, id),
        eq(generations.status, "pending"),
        or(isNull(generations.startedAt), lt(generations.startedAt, cutoff))
      )
    )
    .returning({ id: generations.id });
  if (claimed) return { ok: true };

  const [row] = await db
    .select({ status: generations.status })
    .from(generations)
    .where(eq(generations.id, id))
    .limit(1);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.status !== "pending") return { ok: false, reason: "not_pending" };
  return { ok: false, reason: "already_running" };
}

export type ResetForRetryOutcome =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_retryable" };

export async function resetGenerationForRetry(
  id: string
): Promise<ResetForRetryOutcome> {
  const db = getDb();
  const staleCutoff = new Date(Date.now() - LIMITS.runLockWindowMs);
  const [reset] = await db
    .update(generations)
    .set({
      status: "pending",
      errorMessage: null,
      errorCode: null,
      errorDetail: null,
      startedAt: null,
      completedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(generations.id, id),
        or(
          eq(generations.status, "failed"),
          and(
            inArray(generations.status, ["extracting", "generating"]),
            or(
              isNull(generations.startedAt),
              lt(generations.startedAt, staleCutoff)
            )
          )
        )
      )
    )
    .returning({ id: generations.id });
  if (reset) return { ok: true };

  const [row] = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.id, id))
    .limit(1);
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: false, reason: "not_retryable" };
}

export async function clearGenerationRunLock(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(generations)
    .set({ startedAt: null, updatedAt: new Date() })
    .where(eq(generations.id, id));
}

export interface RefreshContext {
  id: string;
  sourceUrl: string;
  status: GenerationStatus;
  isPublic: boolean;
  updatedAt: Date;
  sourceEtag: string | null;
  sourceLastModified: string | null;
  refreshLockAt: Date | null;
  lastRefreshCheckAt: Date | null;
}

export async function getRefreshContext(
  id: string
): Promise<RefreshContext | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: generations.id,
      sourceUrl: generations.sourceUrl,
      status: generations.status,
      isPublic: generations.isPublic,
      updatedAt: generations.updatedAt,
      sourceEtag: generations.sourceEtag,
      sourceLastModified: generations.sourceLastModified,
      refreshLockAt: generations.refreshLockAt,
      lastRefreshCheckAt: generations.lastRefreshCheckAt,
    })
    .from(generations)
    .where(eq(generations.id, id));
  if (!row) return null;
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    status: row.status as GenerationStatus,
    isPublic: row.isPublic,
    updatedAt: row.updatedAt,
    sourceEtag: row.sourceEtag,
    sourceLastModified: row.sourceLastModified,
    refreshLockAt: row.refreshLockAt,
    lastRefreshCheckAt: row.lastRefreshCheckAt,
  };
}

export async function tryClaimRefreshLock(
  id: string,
  staleAfterMs: number
): Promise<boolean> {
  const db = getDb();
  const cutoff = new Date(Date.now() - staleAfterMs);
  const claimed = await db
    .update(generations)
    .set({ refreshLockAt: new Date() })
    .where(
      and(
        eq(generations.id, id),
        or(isNull(generations.refreshLockAt), lt(generations.refreshLockAt, cutoff))
      )
    )
    .returning({ id: generations.id });
  return claimed.length > 0;
}

export async function releaseRefreshLock(
  id: string,
  opts: { etag?: string | null; lastModified?: string | null; touchUpdated: boolean }
): Promise<void> {
  const db = getDb();
  const set: Partial<typeof generations.$inferInsert> = {
    refreshLockAt: null,
    lastRefreshCheckAt: new Date(),
  };
  if (opts.etag !== undefined) set.sourceEtag = opts.etag;
  if (opts.lastModified !== undefined) set.sourceLastModified = opts.lastModified;
  if (opts.touchUpdated) set.updatedAt = new Date();
  await db.update(generations).set(set).where(eq(generations.id, id));
}

interface FindRecentInput {
  sourceUrl: string;
  mode: GenerationMode;
}

export async function findRecentDoneGeneration(
  input: FindRecentInput
): Promise<{ id: string } | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: generations.id })
    .from(generations)
    .where(
      and(
        eq(generations.sourceUrl, input.sourceUrl),
        eq(generations.mode, input.mode),
        eq(generations.status, "done"),
        eq(generations.isPublic, true),
        eq(generations.isInspiration, false)
      )
    )
    .orderBy(desc(generations.completedAt))
    .limit(1);
  return row ?? null;
}

export async function getGenerationWithArtifacts(
  id: string
): Promise<GenerationWithArtifacts | null> {
  const db = getDb();
  const [row] = await db
    .select({ generation: generations, artifact: generationArtifacts })
    .from(generations)
    .leftJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(eq(generations.id, id))
    .limit(1);
  if (!row) return null;

  const snapshot = row.artifact
    ? await loadExtractedSnapshot({
        url: row.artifact.extractedDataUrl ?? null,
        fallback:
          (row.artifact.extractedData as ExtractedDataSnapshot | null) ?? null,
      })
    : {};

  return mapToDto(row.generation, row.artifact ?? null, snapshot);
}

interface GetPublicGenerationsInput {
  limit?: number;
  cursor?: string | null;
  offset?: number;
  mode?: GenerationMode | null;
  search?: string | null;
}

function buildPublicGenerationFilters(
  input: Pick<GetPublicGenerationsInput, "mode" | "search" | "cursor">
) {
  const filters = [
    eq(generations.isPublic, true),
    eq(generations.status, "done"),
    eq(generations.isInspiration, false),
  ];
  const cursorDate = parseCursor(input.cursor);
  if (cursorDate) filters.push(lt(generations.createdAt, cursorDate));
  if (input.mode) filters.push(eq(generations.mode, input.mode));
  const search = input.search?.trim();
  if (search && search.length > 0) {
    const term = `%${search}%`;
    const match = or(
      ilike(generations.sourceHost, term),
      ilike(generationArtifacts.skillName, term),
      ilike(generationArtifacts.skillDescription, term)
    );
    if (match) filters.push(match);
  }
  return filters;
}

export async function getPublicGenerations(
  input: GetPublicGenerationsInput = {}
): Promise<PublicGenerationCard[]> {
  const db = getDb();
  const limit = clampLimit(input.limit);
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const filters = buildPublicGenerationFilters(input);

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
    .where(and(...filters))
    .orderBy(
      sql`${generations.featuredRank} ASC NULLS LAST`,
      desc(generations.frontend),
      desc(sql`${generations.viewCount} + ${generations.bookmarkCount} * ${RANKING.bookmarkWeight}`),
      desc(generations.createdAt)
    )
    .limit(limit)
    .offset(offset);

  return rows.map(toPublicCard);
}

interface CountPublicGenerationsInput {
  mode?: GenerationMode | null;
  search?: string | null;
}

export async function countPublicGenerations(
  input: CountPublicGenerationsInput = {}
): Promise<number> {
  const db = getDb();
  const filters = buildPublicGenerationFilters(input);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generations)
    .innerJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(and(...filters));
  return row?.count ?? 0;
}

export interface PublicGenerationCounts {
  total: number;
  byMode: Record<GenerationMode, number>;
}

export async function getPublicGenerationCounts(): Promise<PublicGenerationCounts> {
  const db = getDb();
  const rows = await db
    .select({
      mode: generations.mode,
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
    .groupBy(generations.mode);

  const byMode: Record<GenerationMode, number> = {
    design: 0,
    motion: 0,
    api: 0,
    library: 0,
    generic: 0,
  };
  let total = 0;
  for (const row of rows) {
    const mode = row.mode as GenerationMode;
    byMode[mode] = row.count;
    total += row.count;
  }
  return { total, byMode };
}

export async function incrementGenerationView(
  id: string,
  viewerKey: string
): Promise<number | null> {
  const db = getDb();

  const inserted = await db
    .insert(generationViews)
    .values({ generationId: id, viewerKey })
    .onConflictDoNothing()
    .returning({ generationId: generationViews.generationId });

  if (inserted.length === 0) {
    const [row] = await db
      .select({ viewCount: generations.viewCount })
      .from(generations)
      .where(eq(generations.id, id))
      .limit(1);
    return row?.viewCount ?? null;
  }

  const [row] = await db
    .update(generations)
    .set({ viewCount: sql`${generations.viewCount} + 1` })
    .where(eq(generations.id, id))
    .returning({ viewCount: generations.viewCount });
  return row?.viewCount ?? null;
}

export interface SkillBySlugRow {
  slug: string;
  name: string;
  description: string;
  skillMd: string;
  sourceUrl: string;
  updatedAt: string;
}

export async function findPublicGenerationIdBySlug(
  slug: string
): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ id: generations.id })
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
        eq(generationArtifacts.skillName, slug)
      )
    )
    .orderBy(desc(generations.completedAt))
    .limit(1);
  return row?.id ?? null;
}

export async function findPublicSkillBySlug(
  slug: string
): Promise<SkillBySlugRow | null> {
  const db = getDb();
  const [row] = await db
    .select({
      skillName: generationArtifacts.skillName,
      skillDescription: generationArtifacts.skillDescription,
      skillMd: generationArtifacts.skillMd,
      sourceUrl: generations.sourceUrl,
      updatedAt: generations.updatedAt,
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
        eq(generationArtifacts.skillName, slug)
      )
    )
    .orderBy(desc(generations.completedAt))
    .limit(1);

  if (!row || !row.skillMd || !row.skillName || !row.skillDescription) {
    return null;
  }

  return {
    slug: row.skillName,
    name: row.skillName,
    description: row.skillDescription,
    skillMd: row.skillMd,
    sourceUrl: row.sourceUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface AccessibleSkillBySlugRow extends SkillBySlugRow {
  generationId: string;
}

export async function findAccessibleSkillBySlug(
  slug: string,
  viewerUserId: string | null
): Promise<AccessibleSkillBySlugRow | null> {
  const db = getDb();

  const accessFilters = [eq(generations.isPublic, true)];
  if (viewerUserId) {
    accessFilters.push(eq(generations.userId, viewerUserId));
    const bookmarkRows = await db
      .select({ generationId: bookmarks.generationId })
      .from(bookmarks)
      .where(eq(bookmarks.userId, viewerUserId));
    const bookmarkedIds = bookmarkRows.map((row) => row.generationId);
    if (bookmarkedIds.length > 0) {
      accessFilters.push(inArray(generations.id, bookmarkedIds));
    }
  }
  const accessClause =
    accessFilters.length === 1 ? accessFilters[0] : or(...accessFilters);

  const orderBy = viewerUserId
    ? [
        sql`case when ${generations.userId} = ${viewerUserId} then 0 else 1 end`,
        desc(generations.completedAt),
      ]
    : [desc(generations.completedAt)];

  const [row] = await db
    .select({
      generationId: generations.id,
      skillName: generationArtifacts.skillName,
      skillDescription: generationArtifacts.skillDescription,
      skillMd: generationArtifacts.skillMd,
      sourceUrl: generations.sourceUrl,
      updatedAt: generations.updatedAt,
    })
    .from(generations)
    .innerJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(
      and(
        eq(generations.status, "done"),
        eq(generations.isInspiration, false),
        eq(generationArtifacts.skillName, slug),
        accessClause
      )
    )
    .orderBy(...orderBy)
    .limit(1);

  if (!row || !row.skillMd || !row.skillName || !row.skillDescription) {
    return null;
  }

  return {
    generationId: row.generationId,
    slug: row.skillName,
    name: row.skillName,
    description: row.skillDescription,
    skillMd: row.skillMd,
    sourceUrl: row.sourceUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findGenerationByIdForUser(
  id: string,
  userId: string
): Promise<GenerationWithArtifacts | null> {
  const db = getDb();
  const [row] = await db
    .select({ generation: generations, artifact: generationArtifacts })
    .from(generations)
    .leftJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(and(eq(generations.id, id), eq(generations.userId, userId)))
    .limit(1);
  if (!row) return null;

  const snapshot = row.artifact
    ? await loadExtractedSnapshot({
        url: row.artifact.extractedDataUrl ?? null,
        fallback:
          (row.artifact.extractedData as ExtractedDataSnapshot | null) ?? null,
      })
    : {};

  return mapToDto(row.generation, row.artifact ?? null, snapshot);
}

export type OwnedActionOutcome =
  | { ok: true }
  | { ok: false; reason: "not_found" };

export interface GenerationManageInput {
  userId: string;
  ipHash: string;
}

function generationManageWhere(id: string, input: GenerationManageInput) {
  return and(
    eq(generations.id, id),
    or(
      eq(generations.userId, input.userId),
      and(isNull(generations.userId), eq(generations.ipHash, input.ipHash))
    )
  );
}

export async function archiveGeneration(
  id: string,
  input: GenerationManageInput
): Promise<OwnedActionOutcome> {
  const db = getDb();
  const [row] = await db
    .update(generations)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(
      and(generationManageWhere(id, input), isNull(generations.archivedAt))
    )
    .returning({ id: generations.id });
  return row ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function unarchiveGeneration(
  id: string,
  input: GenerationManageInput
): Promise<OwnedActionOutcome> {
  const db = getDb();
  const [row] = await db
    .update(generations)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(generationManageWhere(id, input))
    .returning({ id: generations.id });
  return row ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function deleteGenerationOwned(
  id: string,
  input: GenerationManageInput
): Promise<OwnedActionOutcome> {
  const db = getDb();
  const deleted = await db
    .delete(generations)
    .where(generationManageWhere(id, input))
    .returning({ id: generations.id });
  return deleted.length > 0 ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function claimGuestGenerationsForUser(input: {
  userId: string;
  cookieKey: string;
}): Promise<number> {
  const db = getDb();
  const claimed = await db
    .update(generations)
    .set({ userId: input.userId, updatedAt: new Date() })
    .where(
      and(
        isNull(generations.userId),
        eq(generations.cookieKey, input.cookieKey)
      )
    )
    .returning({ id: generations.id });
  return claimed.length;
}

function pickFeaturedViewJitter(): number {
  const { jitterMin, jitterMax } = FEATURED_VIEW_BOOST;
  return jitterMin + Math.floor(Math.random() * (jitterMax - jitterMin + 1));
}

function featuredViewTarget(input: {
  currentViewCount: number;
  aboveViewCount: number | null;
  belowViewCount: number | null;
  peakViewCount: number;
}): number {
  const { currentViewCount, aboveViewCount, belowViewCount, peakViewCount } =
    input;

  if (aboveViewCount === null) {
    return Math.max(peakViewCount, currentViewCount) + pickFeaturedViewJitter();
  }

  if (belowViewCount === null) {
    const candidate = Math.min(
      aboveViewCount - pickFeaturedViewJitter(),
      aboveViewCount
    );
    return Math.max(currentViewCount, candidate);
  }

  const hi = Math.max(aboveViewCount, belowViewCount);
  const lo = Math.min(aboveViewCount, belowViewCount);
  const midpoint = Math.floor((hi + lo) / 2);
  let candidate = midpoint + pickFeaturedViewJitter();
  if (candidate >= hi) candidate = midpoint;
  return Math.max(currentViewCount, Math.max(candidate, lo + 1));
}

export async function setGenerationFeaturedRank(
  id: string,
  rank: number | null
): Promise<{ id: string; featuredRank: number | null } | null> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [target] = await tx
      .update(generations)
      .set({ featuredRank: rank, updatedAt: new Date() })
      .where(eq(generations.id, id))
      .returning({
        id: generations.id,
        featuredRank: generations.featuredRank,
        viewCount: generations.viewCount,
        featuredViewBoost: generations.featuredViewBoost,
      });

    if (!target) return null;

    if (rank === null) {
      if (target.featuredViewBoost <= 0) {
        return { id: target.id, featuredRank: target.featuredRank };
      }
      const restored = Math.max(0, target.viewCount - target.featuredViewBoost);
      const [deflated] = await tx
        .update(generations)
        .set({ viewCount: restored, featuredViewBoost: 0 })
        .where(eq(generations.id, id))
        .returning({
          id: generations.id,
          featuredRank: generations.featuredRank,
        });
      return deflated ?? { id: target.id, featuredRank: target.featuredRank };
    }

    const visible = and(
      eq(generations.isPublic, true),
      eq(generations.status, "done"),
      eq(generations.isInspiration, false)
    );

    const [above] = await tx
      .select({ viewCount: generations.viewCount })
      .from(generations)
      .where(
        and(
          visible,
          isNotNull(generations.featuredRank),
          lt(generations.featuredRank, rank),
          ne(generations.id, id)
        )
      )
      .orderBy(desc(generations.featuredRank))
      .limit(1);

    const [below] = await tx
      .select({ viewCount: generations.viewCount })
      .from(generations)
      .where(
        and(
          visible,
          isNotNull(generations.featuredRank),
          gt(generations.featuredRank, rank),
          ne(generations.id, id)
        )
      )
      .orderBy(asc(generations.featuredRank))
      .limit(1);

    let peakViewCount = 0;
    if (!above) {
      const [peak] = await tx
        .select({
          max: sql<number>`coalesce(max(${generations.viewCount}), 0)::int`,
        })
        .from(generations)
        .where(and(visible, ne(generations.id, id)));
      peakViewCount = peak?.max ?? 0;
    }

    const boosted = featuredViewTarget({
      currentViewCount: target.viewCount,
      aboveViewCount: above?.viewCount ?? null,
      belowViewCount: below?.viewCount ?? null,
      peakViewCount,
    });

    if (boosted <= target.viewCount) {
      return { id: target.id, featuredRank: target.featuredRank };
    }

    const addedBoost = boosted - target.viewCount;
    const [updated] = await tx
      .update(generations)
      .set({
        viewCount: boosted,
        featuredViewBoost: sql`${generations.featuredViewBoost} + ${addedBoost}`,
      })
      .where(eq(generations.id, id))
      .returning({
        id: generations.id,
        featuredRank: generations.featuredRank,
      });

    return updated ?? { id: target.id, featuredRank: target.featuredRank };
  });
}

export async function setGenerationVisibility(
  id: string,
  isPublic: boolean
): Promise<GenerationRow | null> {
  const db = getDb();
  const [row] = await db
    .update(generations)
    .set({ isPublic, updatedAt: new Date() })
    .where(eq(generations.id, id))
    .returning();
  return row ?? null;
}

export interface GenerationOwnership {
  id: string;
  ipHash: string;
  userId: string | null;
  isPublic: boolean;
  isInspiration: boolean;
  status: GenerationStatus;
  adminRescuedAt: Date | null;
}

export async function getGenerationOwnership(
  id: string
): Promise<GenerationOwnership | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: generations.id,
      ipHash: generations.ipHash,
      userId: generations.userId,
      isPublic: generations.isPublic,
      isInspiration: generations.isInspiration,
      status: generations.status,
      adminRescuedAt: generations.adminRescuedAt,
    })
    .from(generations)
    .where(eq(generations.id, id));
  if (!row) return null;
  return {
    id: row.id,
    ipHash: row.ipHash,
    userId: row.userId,
    isPublic: row.isPublic,
    isInspiration: row.isInspiration,
    status: row.status as GenerationStatus,
    adminRescuedAt: row.adminRescuedAt,
  };
}

export interface GenerationSourceMeta {
  userId: string | null;
  sourceKind: SourceKind;
  imageMediaType: string | null;
  parentSkillBodies: string[];
}

const IMAGE_EXTENSION_TO_MEDIA_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function inferImageMediaType(input: {
  inspirationImageKey: string | null;
  sourceUrl: string;
}): string | null {
  const candidate = input.inspirationImageKey ?? input.sourceUrl;
  const match = candidate.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (!match) return null;
  const ext = match[1].toLowerCase();
  return IMAGE_EXTENSION_TO_MEDIA_TYPE[ext] ?? null;
}

export async function getGenerationSourceMeta(
  id: string
): Promise<GenerationSourceMeta | null> {
  const db = getDb();
  const [row] = await db
    .select({
      userId: generations.userId,
      sourceUrl: generations.sourceUrl,
      sourceKind: generations.sourceKind,
      inspirationImageKey: generations.inspirationImageKey,
      inspirationParentIds: generations.inspirationParentIds,
    })
    .from(generations)
    .where(eq(generations.id, id));
  if (!row) return null;

  const parentIds = row.inspirationParentIds ?? [];
  let parentSkillBodies: string[] = [];
  if (parentIds.length > 0) {
    const parents = await db
      .select({
        generationId: generationArtifacts.generationId,
        skillMd: generationArtifacts.skillMd,
      })
      .from(generationArtifacts)
      .where(inArray(generationArtifacts.generationId, parentIds));
    const byId = new Map(parents.map((p) => [p.generationId, p.skillMd]));
    parentSkillBodies = parentIds
      .map((parentId) => byId.get(parentId))
      .filter((body): body is string => Boolean(body));
  }

  return {
    userId: row.userId,
    sourceKind: row.sourceKind as SourceKind,
    imageMediaType: inferImageMediaType({
      inspirationImageKey: row.inspirationImageKey,
      sourceUrl: row.sourceUrl,
    }),
    parentSkillBodies,
  };
}

function clampLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_PUBLIC_LIMIT;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_PUBLIC_LIMIT);
}

function parseCursor(cursor: string | null | undefined): Date | null {
  if (!cursor) return null;
  const date = new Date(cursor);
  return Number.isNaN(date.getTime()) ? null : date;
}

interface PublicRow {
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

function toPublicCard(row: PublicRow): PublicGenerationCard {
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
}

function mapToDto(
  row: GenerationRow,
  artifact: GenerationArtifactsRow | null,
  snapshot: ExtractedDataSnapshot
): GenerationWithArtifacts {
  return {
    id: row.id,
    sourceUrl: row.sourceUrl,
    sourceHost: row.sourceHost,
    mode: row.mode as GenerationMode,
    status: row.status as GenerationStatus,
    isPublic: row.isPublic,
    viewCount: row.viewCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    errorMessage: row.errorMessage,
    parentGenerationId: row.parentGenerationId ?? null,
    feedback: row.feedback ?? null,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    artifacts: {
      generationId: row.id,
      screenshotAbove: artifact?.screenshotAbove ?? null,
      screenshotFull: artifact?.screenshotFull ?? null,
      extractedData: snapshot,
      skillMd: artifact?.skillMd ?? null,
      skillName: artifact?.skillName ?? null,
      skillDescription: artifact?.skillDescription ?? null,
      quality: (artifact?.quality as SkillQuality | null | undefined) ?? null,
    },
  };
}
