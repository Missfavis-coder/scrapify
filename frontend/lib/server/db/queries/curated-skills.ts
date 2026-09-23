import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { curatedSkills, curatedSkillUrls } from "@/lib/server/db/schema";
import type {
  CuratedAdminCounts,
  CuratedDetail,
  CuratedKindFilter,
  CuratedSummary,
  CuratedTopHost,
} from "@/lib/types/curated";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

interface ListInput {
  kind?: CuratedKindFilter;
  mode?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildCuratedFilters(input: Omit<ListInput, "limit" | "offset">) {
  const conditions = [
    eq(curatedSkills.source, "skills.sh"),
    eq(curatedSkills.status, "ingested"),
  ];
  if (input.kind && input.kind !== "all") {
    conditions.push(eq(curatedSkills.kind, input.kind));
  }
  if (input.mode) {
    conditions.push(eq(curatedSkills.mode, input.mode));
  }
  if (input.search && input.search.trim().length > 0) {
    const term = `%${input.search.trim()}%`;
    const search = or(
      ilike(curatedSkills.name, term),
      ilike(curatedSkills.description, term),
      ilike(curatedSkills.canonicalHost, term),
      ilike(curatedSkills.slug, term)
    );
    if (search) conditions.push(search);
  }
  return conditions;
}

export async function listCuratedSkills(input: ListInput = {}): Promise<CuratedSummary[]> {
  const db = getDb();
  const limit = Math.min(MAX_LIMIT, input.limit ?? DEFAULT_LIMIT);
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const conditions = buildCuratedFilters(input);

  const rows = await db
    .select({
      id: curatedSkills.id,
      owner: curatedSkills.owner,
      repo: curatedSkills.repo,
      slug: curatedSkills.slug,
      name: curatedSkills.name,
      description: curatedSkills.description,
      kind: curatedSkills.kind,
      mode: curatedSkills.mode,
      canonicalUrl: curatedSkills.canonicalUrl,
      canonicalHost: curatedSkills.canonicalHost,
      sourceUrl: curatedSkills.sourceUrl,
      repoUrl: curatedSkills.repoUrl,
      contentBytes: curatedSkills.contentBytes,
      ingestedAt: curatedSkills.ingestedAt,
    })
    .from(curatedSkills)
    .where(and(...conditions))
    .orderBy(desc(curatedSkills.ingestedAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.id,
    owner: row.owner,
    repo: row.repo,
    slug: row.slug,
    name: row.name ?? row.slug,
    description: row.description,
    kind: (row.kind as CuratedSummary["kind"]) ?? "methodology",
    mode: row.mode,
    canonicalUrl: row.canonicalUrl,
    canonicalHost: row.canonicalHost,
    sourceUrl: row.sourceUrl,
    repoUrl: row.repoUrl,
    contentBytes: row.contentBytes,
    ingestedAt: row.ingestedAt ? row.ingestedAt.toISOString() : null,
  }));
}

type CountInput = Omit<ListInput, "limit" | "offset">;

export async function countCuratedSkills(input: CountInput = {}): Promise<number> {
  const db = getDb();
  const conditions = buildCuratedFilters(input);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedSkills)
    .where(and(...conditions));
  return row?.count ?? 0;
}

export async function countCuratedByKind(): Promise<{
  total: number;
  docs: number;
  methodology: number;
  tooling: number;
}> {
  const db = getDb();
  const rows = await db
    .select({
      kind: curatedSkills.kind,
      count: sql<number>`count(*)::int`,
    })
    .from(curatedSkills)
    .where(
      and(eq(curatedSkills.source, "skills.sh"), eq(curatedSkills.status, "ingested"))
    )
    .groupBy(curatedSkills.kind);

  const map: Record<string, number> = {};
  for (const r of rows) map[r.kind] = r.count;
  return {
    total: rows.reduce((s, r) => s + r.count, 0),
    docs: map.docs ?? 0,
    methodology: map.methodology ?? 0,
    tooling: map.tooling ?? 0,
  };
}

export async function getCuratedSkill(
  owner: string,
  repo: string,
  slug: string
): Promise<CuratedDetail | null> {
  const db = getDb();
  const [row] = await db
    .select({
      skill: curatedSkills,
      matchUrls: sql<
        Array<{ host: string; pathPrefix: string; matchType: string }>
      >`COALESCE(
        json_agg(
          json_build_object(
            'host', ${curatedSkillUrls.host},
            'pathPrefix', ${curatedSkillUrls.pathPrefix},
            'matchType', ${curatedSkillUrls.matchType}
          )
        ) FILTER (WHERE ${curatedSkillUrls.skillId} IS NOT NULL),
        '[]'::json
      )`,
    })
    .from(curatedSkills)
    .leftJoin(
      curatedSkillUrls,
      eq(curatedSkillUrls.skillId, curatedSkills.id)
    )
    .where(
      and(
        eq(curatedSkills.source, "skills.sh"),
        eq(curatedSkills.owner, owner),
        eq(curatedSkills.repo, repo),
        eq(curatedSkills.slug, slug)
      )
    )
    .groupBy(curatedSkills.id)
    .limit(1);

  if (!row) return null;
  const skill = row.skill;
  if (skill.status !== "ingested" || !skill.contentMd) return null;

  return {
    id: skill.id,
    owner: skill.owner,
    repo: skill.repo,
    slug: skill.slug,
    name: skill.name ?? skill.slug,
    description: skill.description,
    kind: (skill.kind as CuratedDetail["kind"]) ?? "methodology",
    mode: skill.mode,
    canonicalUrl: skill.canonicalUrl,
    canonicalHost: skill.canonicalHost,
    contentMd: skill.contentMd,
    contentBytes: skill.contentBytes,
    installCommand: skill.installCommand,
    repoUrl: skill.repoUrl,
    sourceUrl: skill.sourceUrl,
    ingestedAt: skill.ingestedAt ? skill.ingestedAt.toISOString() : null,
    matchUrls: row.matchUrls.map((u) => ({
      host: u.host,
      pathPrefix: u.pathPrefix,
      matchType: u.matchType as CuratedDetail["matchUrls"][number]["matchType"],
    })),
  };
}

export async function findCuratedSkillByHost(host: string): Promise<CuratedSummary | null> {
  const db = getDb();
  const cleanHost = host.replace(/^www\./, "").toLowerCase();
  const [row] = await db
    .select({
      id: curatedSkills.id,
      owner: curatedSkills.owner,
      repo: curatedSkills.repo,
      slug: curatedSkills.slug,
      name: curatedSkills.name,
      description: curatedSkills.description,
      kind: curatedSkills.kind,
      mode: curatedSkills.mode,
      canonicalUrl: curatedSkills.canonicalUrl,
      canonicalHost: curatedSkills.canonicalHost,
      sourceUrl: curatedSkills.sourceUrl,
      repoUrl: curatedSkills.repoUrl,
      contentBytes: curatedSkills.contentBytes,
      ingestedAt: curatedSkills.ingestedAt,
    })
    .from(curatedSkills)
    .where(
      and(
        eq(curatedSkills.source, "skills.sh"),
        eq(curatedSkills.status, "ingested"),
        eq(curatedSkills.canonicalHost, cleanHost)
      )
    )
    .limit(1);

  if (!row) return null;
  return {
    id: row.id,
    owner: row.owner,
    repo: row.repo,
    slug: row.slug,
    name: row.name ?? row.slug,
    description: row.description,
    kind: (row.kind as CuratedSummary["kind"]) ?? "methodology",
    mode: row.mode,
    canonicalUrl: row.canonicalUrl,
    canonicalHost: row.canonicalHost,
    sourceUrl: row.sourceUrl,
    repoUrl: row.repoUrl,
    contentBytes: row.contentBytes,
    ingestedAt: row.ingestedAt ? row.ingestedAt.toISOString() : null,
  };
}

export async function getCuratedAdminCounts(): Promise<CuratedAdminCounts> {
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

  const kindRows = await db
    .select({
      kind: curatedSkills.kind,
      count: sql<number>`count(*)::int`,
    })
    .from(curatedSkills)
    .where(
      and(eq(curatedSkills.source, "skills.sh"), eq(curatedSkills.status, "ingested"))
    )
    .groupBy(curatedSkills.kind);

  const kindMap: Record<string, number> = {};
  for (const r of kindRows) kindMap[r.kind] = r.count;

  return {
    total: rows.reduce((s, r) => s + r.count, 0),
    pending: map.pending ?? 0,
    ingested: map.ingested ?? 0,
    failed: map.failed ?? 0,
    skipped: map.skipped ?? 0,
    docs: kindMap.docs ?? 0,
    methodology: kindMap.methodology ?? 0,
    tooling: kindMap.tooling ?? 0,
  };
}

export async function getCuratedTopHosts(limit = 10): Promise<CuratedTopHost[]> {
  const db = getDb();
  const rows = await db
    .select({
      host: curatedSkills.canonicalHost,
      count: sql<number>`count(*)::int`,
    })
    .from(curatedSkills)
    .where(
      and(
        eq(curatedSkills.source, "skills.sh"),
        eq(curatedSkills.status, "ingested"),
        sql`${curatedSkills.canonicalHost} IS NOT NULL`
      )
    )
    .groupBy(curatedSkills.canonicalHost)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);
  return rows
    .filter((r): r is { host: string; count: number } => r.host !== null)
    .map((r) => ({ host: r.host, count: r.count }));
}

export async function getRecentCuratedSkills(limit = 10): Promise<CuratedSummary[]> {
  return listCuratedSkills({ limit });
}
