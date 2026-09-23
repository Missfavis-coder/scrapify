import { and, desc, eq, ilike, isNotNull, lt, notInArray, or, sql } from "drizzle-orm";
import { MODE_IDS } from "@/lib/constants/modes";
import { getDb } from "@/lib/server/db/client";
import {
  generationArtifacts,
  generations,
  generationVersions,
  users,
} from "@/lib/server/db/schema";
import {
  deleteJsonByUrl,
  deleteScreenshotByUrl,
} from "@/lib/server/storage/r2";
import { logError } from "@/lib/server/logger";
import { ADMIN } from "@/lib/constants/admin";
import type {
  AdminSkillEntry,
  AdminSkillsCounts,
  AdminSkillsFilter,
  AdminSkillsPagePayload,
} from "@/lib/types/admin";

const KNOWN_MODES = new Set<string>(MODE_IDS);
const SETTLED_STATUSES = ["done", "failed"];

interface ListSkillsInput {
  page: number;
  pageSize: number;
  search: string;
  filter: AdminSkillsFilter;
}

function toEntry(row: {
  id: string;
  sourceHost: string;
  sourceUrl: string;
  mode: string;
  status: string;
  isPublic: boolean;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  feedback: string | null;
  featuredRank: number | null;
  skillName: string | null;
  skillDescription: string | null;
  isInspiration: boolean;
  userDisplayName: string | null;
  userEmail: string | null;
  errorMessage: string | null;
  errorCode: string | null;
}): AdminSkillEntry {
  return {
    id: row.id,
    sourceHost: row.sourceHost,
    sourceUrl: row.sourceUrl,
    mode: row.mode,
    status: row.status,
    isPublic: row.isPublic,
    viewCount: row.viewCount,
    skillName: row.skillName ?? null,
    skillDescription: row.skillDescription ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    hasFeedback: Boolean(row.feedback && row.feedback.trim().length > 0),
    featuredRank: row.featuredRank,
    isInspiration: row.isInspiration,
    userDisplayName: row.userDisplayName,
    userEmail: row.userEmail,
    errorMessage: row.errorMessage,
    errorCode: row.errorCode,
  };
}

export async function listAdminSkillsPage(
  input: ListSkillsInput
): Promise<AdminSkillsPagePayload> {
  const db = getDb();
  const staleCutoff = new Date(
    Date.now() - ADMIN.staleDesignDays * 24 * 60 * 60 * 1000
  );

  const filterCondition = buildFilterCondition(input.filter, staleCutoff);
  const searchTerm = input.search.trim();
  const searchCondition =
    searchTerm.length > 0
      ? or(
          ilike(generationArtifacts.skillName, `%${searchTerm}%`),
          ilike(generationArtifacts.skillDescription, `%${searchTerm}%`),
          ilike(generations.sourceHost, `%${searchTerm}%`),
          ilike(generations.sourceUrl, `%${searchTerm}%`)
        )
      : undefined;

  const whereParts = [filterCondition, searchCondition].filter(
    (c): c is NonNullable<typeof c> => c !== undefined
  );
  const whereClause = whereParts.length > 0 ? and(...whereParts) : undefined;

  const page = Math.max(1, input.page);
  const pageSize = Math.max(1, Math.min(100, input.pageSize));
  const offset = (page - 1) * pageSize;

  const orderBy =
    input.filter === "stale"
      ? generations.updatedAt
      : input.filter === "featured"
        ? sql`coalesce(${generations.featuredRank}, 999999), ${generations.createdAt} desc`
        : desc(generations.createdAt);

  const rows = await db
    .select({
      id: generations.id,
      sourceHost: generations.sourceHost,
      sourceUrl: generations.sourceUrl,
      mode: generations.mode,
      status: generations.status,
      isPublic: generations.isPublic,
      viewCount: generations.viewCount,
      createdAt: generations.createdAt,
      updatedAt: generations.updatedAt,
      feedback: generations.feedback,
      featuredRank: generations.featuredRank,
      skillName: generationArtifacts.skillName,
      skillDescription: generationArtifacts.skillDescription,
      isInspiration: generations.isInspiration,
      userDisplayName: users.displayName,
      userEmail: users.email,
      errorMessage: generations.errorMessage,
      errorCode: generations.errorCode,
    })
    .from(generations)
    .leftJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .leftJoin(users, eq(users.id, generations.userId))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generations)
    .leftJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(whereClause);

  const counts = await getSkillsCounts(staleCutoff);

  return {
    entries: rows.map(toEntry),
    total: totalRow?.count ?? 0,
    page,
    pageSize,
    filter: input.filter,
    search: searchTerm,
    counts,
    staleOlderThanDays: ADMIN.staleDesignDays,
  };
}

function buildFilterCondition(filter: AdminSkillsFilter, staleCutoff: Date) {
  if (filter === "inspiration") {
    return eq(generations.isInspiration, true);
  }
  const skillsOnly = eq(generations.isInspiration, false);
  if (filter === "all") return skillsOnly;
  if (filter === "done") {
    return and(skillsOnly, eq(generations.status, "done"));
  }
  if (filter === "failed") {
    return and(skillsOnly, eq(generations.status, "failed"));
  }
  if (filter === "running") {
    return and(skillsOnly, notInArray(generations.status, SETTLED_STATUSES));
  }
  if (filter === "featured") {
    return and(skillsOnly, isNotNull(generations.featuredRank));
  }
  if (filter === "private") {
    return and(skillsOnly, eq(generations.isPublic, false));
  }
  if (filter === "stale") {
    return and(
      skillsOnly,
      eq(generations.mode, "design"),
      eq(generations.status, "done"),
      lt(generations.updatedAt, staleCutoff)
    );
  }
  if (KNOWN_MODES.has(filter)) {
    return and(skillsOnly, eq(generations.mode, filter));
  }
  return skillsOnly;
}

async function getSkillsCounts(staleCutoff: Date): Promise<AdminSkillsCounts> {
  const db = getDb();
  const [aggRow] = await db
    .select({
      all: sql<number>`count(*) filter (where ${generations.isInspiration} = false)::int`,
      done: sql<number>`count(*) filter (where ${generations.isInspiration} = false and ${generations.status} = 'done')::int`,
      failed: sql<number>`count(*) filter (where ${generations.isInspiration} = false and ${generations.status} = 'failed')::int`,
      running: sql<number>`count(*) filter (where ${generations.isInspiration} = false and ${generations.status} not in ('done', 'failed'))::int`,
      featured: sql<number>`count(*) filter (where ${generations.isInspiration} = false and ${generations.featuredRank} is not null)::int`,
      private: sql<number>`count(*) filter (where ${generations.isInspiration} = false and ${generations.isPublic} = false)::int`,
      inspirations: sql<number>`count(*) filter (where ${generations.isInspiration} = true)::int`,
    })
    .from(generations);

  const [staleRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generations)
    .where(
      and(
        eq(generations.isInspiration, false),
        eq(generations.mode, "design"),
        eq(generations.status, "done"),
        lt(generations.updatedAt, staleCutoff)
      )
    );

  const modeRows = await db
    .select({
      mode: generations.mode,
      count: sql<number>`count(*)::int`,
    })
    .from(generations)
    .where(eq(generations.isInspiration, false))
    .groupBy(generations.mode);

  const byMode: Record<string, number> = {};
  for (const row of modeRows) byMode[row.mode] = row.count;

  return {
    all: aggRow?.all ?? 0,
    done: aggRow?.done ?? 0,
    failed: aggRow?.failed ?? 0,
    running: aggRow?.running ?? 0,
    featured: aggRow?.featured ?? 0,
    private: aggRow?.private ?? 0,
    stale: staleRow?.count ?? 0,
    inspirations: aggRow?.inspirations ?? 0,
    byMode,
  };
}

export interface DeleteAdminSkillResult {
  ok: true;
  id: string;
}

export async function deleteAdminSkill(
  id: string
): Promise<DeleteAdminSkillResult | null> {
  const db = getDb();

  const [artifact] = await db
    .select({
      screenshotAbove: generationArtifacts.screenshotAbove,
      screenshotFull: generationArtifacts.screenshotFull,
      extractedDataUrl: generationArtifacts.extractedDataUrl,
    })
    .from(generationArtifacts)
    .where(eq(generationArtifacts.generationId, id));

  const versionUrls = await db
    .select({ extractedDataUrl: generationVersions.extractedDataUrl })
    .from(generationVersions)
    .where(
      and(
        eq(generationVersions.generationId, id),
        isNotNull(generationVersions.extractedDataUrl)
      )
    );

  const [deleted] = await db
    .delete(generations)
    .where(eq(generations.id, id))
    .returning({ id: generations.id });

  if (!deleted) return null;

  const blobsToRemove: string[] = [];
  const screenshotsToRemove: string[] = [];
  if (artifact?.screenshotAbove) screenshotsToRemove.push(artifact.screenshotAbove);
  if (artifact?.screenshotFull) screenshotsToRemove.push(artifact.screenshotFull);
  if (artifact?.extractedDataUrl) blobsToRemove.push(artifact.extractedDataUrl);
  for (const row of versionUrls) {
    if (row.extractedDataUrl) blobsToRemove.push(row.extractedDataUrl);
  }

  await Promise.allSettled([
    ...screenshotsToRemove.map((url) =>
      deleteScreenshotByUrl(url).catch((error) =>
        logError("admin.delete-skill.screenshot", error, { id, url })
      )
    ),
    ...blobsToRemove.map((url) =>
      deleteJsonByUrl(url).catch((error) =>
        logError("admin.delete-skill.blob", error, { id, url })
      )
    ),
  ]);

  return { ok: true, id: deleted.id };
}

