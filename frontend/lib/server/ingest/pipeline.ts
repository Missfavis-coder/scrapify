import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getIngestDb as getDb } from "@/lib/server/ingest/db";
import { curatedSkills, curatedSkillUrls } from "@/lib/server/db/schema";
import { fetchSitemapEntries } from "@/lib/server/ingest/skills-sh";
import { resolveSkillBySlug } from "@/lib/server/ingest/github-tree";
import { classifySkill } from "@/lib/server/ingest/classify";
import { DEFAULT_BATCH_LIMIT, DEFAULT_CONCURRENCY } from "@/lib/server/ingest/constants";
import type { IngestStats, SitemapEntry } from "@/lib/types/curated";

export interface DiscoverFilters {
  owner?: string;
  repo?: string;
}

export interface DiscoverResult {
  total: number;
  inserted: number;
  alreadyKnown: number;
}

export interface ProcessFilters {
  owner?: string;
  repo?: string;
  limit?: number;
  concurrency?: number;
  retryFailed?: boolean;
  retrySkipped?: boolean;
  reingestAll?: boolean;
}

export async function discover(filters: DiscoverFilters = {}): Promise<DiscoverResult> {
  const all = await fetchSitemapEntries();
  const filtered = all.filter((entry) => {
    if (filters.owner && entry.owner !== filters.owner) return false;
    if (filters.repo && entry.repo !== filters.repo) return false;
    return true;
  });

  if (filtered.length === 0) {
    return { total: 0, inserted: 0, alreadyKnown: 0 };
  }

  const db = getDb();
  const existing = await db
    .select({
      owner: curatedSkills.owner,
      repo: curatedSkills.repo,
      slug: curatedSkills.slug,
    })
    .from(curatedSkills)
    .where(eq(curatedSkills.source, "skills.sh"));

  const existingKeys = new Set(existing.map((e) => `${e.owner}/${e.repo}/${e.slug}`));
  const fresh = filtered.filter(
    (entry) => !existingKeys.has(`${entry.owner}/${entry.repo}/${entry.slug}`)
  );

  if (fresh.length === 0) {
    return { total: filtered.length, inserted: 0, alreadyKnown: filtered.length };
  }

  const rows = fresh.map((entry) => ({
    id: nanoid(),
    source: entry.source,
    owner: entry.owner,
    repo: entry.repo,
    slug: entry.slug,
    sourceUrl: entry.sourceUrl,
    status: "pending" as const,
    kind: "pending" as const,
  }));

  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await db.insert(curatedSkills).values(chunk).onConflictDoNothing();
  }

  return {
    total: filtered.length,
    inserted: fresh.length,
    alreadyKnown: filtered.length - fresh.length,
  };
}

export async function processBatch(filters: ProcessFilters = {}): Promise<IngestStats> {
  const db = getDb();
  const limit = filters.limit ?? DEFAULT_BATCH_LIMIT;
  const concurrency = filters.concurrency ?? DEFAULT_CONCURRENCY;

  const statuses: string[] = filters.reingestAll
    ? ["pending", "ingested", "failed", "skipped"]
    : ["pending"]
        .concat(filters.retryFailed ? ["failed"] : [])
        .concat(filters.retrySkipped ? ["skipped"] : []);

  const conditions = [
    eq(curatedSkills.source, "skills.sh"),
    inArray(curatedSkills.status, statuses),
  ];
  if (filters.owner) conditions.push(eq(curatedSkills.owner, filters.owner));
  if (filters.repo) conditions.push(eq(curatedSkills.repo, filters.repo));

  const candidates = await db
    .select()
    .from(curatedSkills)
    .where(and(...conditions))
    .orderBy(asc(curatedSkills.lastCheckedAt), asc(curatedSkills.createdAt))
    .limit(limit);

  const stats: IngestStats = {
    total: candidates.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    skipped: 0,
  };
  if (candidates.length === 0) return stats;

  let cursor = 0;
  const workers: Promise<void>[] = [];
  const failures: Array<{ key: string; error: string }> = [];

  const next = async (): Promise<void> => {
    while (cursor < candidates.length) {
      const idx = cursor++;
      const row = candidates[idx];
      const entry: SitemapEntry = {
        source: "skills.sh",
        owner: row.owner,
        repo: row.repo,
        slug: row.slug,
        sourceUrl: row.sourceUrl,
      };
      const key = `${row.owner}/${row.repo}/${row.slug}`;
      try {
        const outcome = await processOne(row.id, entry, row.contentSha);
        if (outcome === "inserted") stats.inserted += 1;
        else if (outcome === "updated") stats.updated += 1;
        else if (outcome === "unchanged") stats.unchanged += 1;
        else if (outcome === "skipped") stats.skipped += 1;
      } catch (err) {
        stats.failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        failures.push({ key, error: message });
        await db
          .update(curatedSkills)
          .set({
            status: "failed",
            errorMessage: message.slice(0, 1000),
            lastCheckedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(curatedSkills.id, row.id));
      }
    }
  };

  for (let i = 0; i < concurrency; i += 1) workers.push(next());
  await Promise.all(workers);

  if (failures.length > 0) {
    console.warn(`[ingest] ${failures.length} failures in batch:`);
    for (const f of failures.slice(0, 10)) console.warn(`  - ${f.key}: ${f.error}`);
  }

  return stats;
}

type ProcessOutcome = "inserted" | "updated" | "unchanged" | "skipped";

async function processOne(
  rowId: string,
  entry: SitemapEntry,
  prevSha: string | null
): Promise<ProcessOutcome> {
  const db = getDb();
  const resolved = await resolveSkillBySlug(entry.owner, entry.repo, entry.slug);
  if (!resolved) {
    await db
      .update(curatedSkills)
      .set({
        status: "skipped",
        errorMessage: "SKILL.md not found in repo",
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(curatedSkills.id, rowId));
    return "skipped";
  }

  const contentMd = resolved.contentMd;
  const contentSha = sha256(contentMd);
  const isFirstFetch = prevSha == null;
  if (!isFirstFetch && contentSha === prevSha) {
    await db
      .update(curatedSkills)
      .set({
        status: "ingested",
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(curatedSkills.id, rowId));
    return "unchanged";
  }

  const classification = classifySkill(entry, contentMd);
  const installCommand = `npx skills add https://github.com/${entry.owner}/${entry.repo} --skill ${entry.slug}`;
  const repoUrl = `https://github.com/${entry.owner}/${entry.repo}`;
  const now = new Date();

  await db
    .update(curatedSkills)
    .set({
      filePath: resolved.path,
      defaultBranch: resolved.defaultBranch,
      name: classification.name,
      description: classification.description,
      kind: classification.kind,
      mode: classification.mode,
      canonicalUrl: classification.canonicalUrl,
      canonicalHost: classification.canonicalHost,
      installCommand,
      repoUrl,
      contentMd,
      contentSha,
      contentBytes: Buffer.byteLength(contentMd, "utf8"),
      status: "ingested",
      errorMessage: null,
      ingestedAt: now,
      lastCheckedAt: now,
      updatedAt: now,
    })
    .where(eq(curatedSkills.id, rowId));

  await db.delete(curatedSkillUrls).where(eq(curatedSkillUrls.skillId, rowId));
  if (classification.matchUrls.length > 0) {
    await db.insert(curatedSkillUrls).values(
      classification.matchUrls.map((m) => ({
        id: nanoid(),
        skillId: rowId,
        host: m.host,
        pathPrefix: m.pathPrefix,
        matchType: m.matchType,
      }))
    );
  }

  return isFirstFetch ? "inserted" : "updated";
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function reclassifyAll(filters: { owner?: string; repo?: string } = {}): Promise<{
  total: number;
  updated: number;
}> {
  const db = getDb();
  const conditions = [
    eq(curatedSkills.source, "skills.sh"),
    eq(curatedSkills.status, "ingested"),
  ];
  if (filters.owner) conditions.push(eq(curatedSkills.owner, filters.owner));
  if (filters.repo) conditions.push(eq(curatedSkills.repo, filters.repo));

  const rows = await db
    .select()
    .from(curatedSkills)
    .where(and(...conditions));

  let updated = 0;
  for (const row of rows) {
    if (!row.contentMd) continue;
    const entry: SitemapEntry = {
      source: "skills.sh",
      owner: row.owner,
      repo: row.repo,
      slug: row.slug,
      sourceUrl: row.sourceUrl,
    };
    const c = classifySkill(entry, row.contentMd);
    await db
      .update(curatedSkills)
      .set({
        name: c.name,
        description: c.description,
        kind: c.kind,
        mode: c.mode,
        canonicalUrl: c.canonicalUrl,
        canonicalHost: c.canonicalHost,
        updatedAt: new Date(),
      })
      .where(eq(curatedSkills.id, row.id));

    await db.delete(curatedSkillUrls).where(eq(curatedSkillUrls.skillId, row.id));
    if (c.matchUrls.length > 0) {
      await db.insert(curatedSkillUrls).values(
        c.matchUrls.map((m) => ({
          id: nanoid(),
          skillId: row.id,
          host: m.host,
          pathPrefix: m.pathPrefix,
          matchType: m.matchType,
        }))
      );
    }
    updated += 1;
  }
  return { total: rows.length, updated };
}

export async function pendingCount(): Promise<{
  pending: number;
  ingested: number;
  failed: number;
  skipped: number;
  total: number;
}> {
  const db = getDb();
  const rows = await db
    .select({
      status: curatedSkills.status,
      count: sql<number>`count(*)::int`,
    })
    .from(curatedSkills)
    .where(eq(curatedSkills.source, "skills.sh"))
    .groupBy(curatedSkills.status);
  const map: Record<string, number> = {};
  for (const r of rows) map[r.status] = r.count;
  return {
    pending: map.pending ?? 0,
    ingested: map.ingested ?? 0,
    failed: map.failed ?? 0,
    skipped: map.skipped ?? 0,
    total: rows.reduce((sum, r) => sum + r.count, 0),
  };
}
