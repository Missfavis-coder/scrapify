import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import {
  curatedSkills,
  generations,
} from "@/lib/server/db/schema";

export interface SitemapHostEntry {
  host: string;
  count: number;
  lastModified: Date;
}

export interface SitemapGenerationEntry {
  id: string;
  sourceHost: string;
  updatedAt: Date;
  viewCount: number;
}

export interface SitemapCuratedEntry {
  owner: string;
  repo: string;
  slug: string;
  updatedAt: Date;
}

const HOSTS_LIMIT = 500;
const GENERATIONS_LIMIT = 2000;
const CURATED_LIMIT = 5000;

export async function listSitemapHosts(): Promise<SitemapHostEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      host: generations.sourceHost,
      count: sql<number>`count(*)::int`,
      lastModified: sql<Date>`max(${generations.updatedAt})`,
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
    .limit(HOSTS_LIMIT);

  return rows
    .filter((row) => row.host && row.host.length > 0)
    .map((row) => ({
      host: row.host,
      count: row.count,
      lastModified: new Date(row.lastModified),
    }));
}

export async function listSitemapPublicGenerations(): Promise<SitemapGenerationEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: generations.id,
      sourceHost: generations.sourceHost,
      updatedAt: generations.updatedAt,
      viewCount: generations.viewCount,
    })
    .from(generations)
    .where(
      and(
        eq(generations.isPublic, true),
        eq(generations.status, "done"),
        eq(generations.isInspiration, false)
      )
    )
    .orderBy(desc(generations.frontend), desc(generations.viewCount), desc(generations.updatedAt))
    .limit(GENERATIONS_LIMIT);

  return rows.map((row) => ({
    id: row.id,
    sourceHost: row.sourceHost,
    updatedAt: row.updatedAt,
    viewCount: row.viewCount,
  }));
}

export async function listSitemapCuratedSkills(): Promise<SitemapCuratedEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      owner: curatedSkills.owner,
      repo: curatedSkills.repo,
      slug: curatedSkills.slug,
      updatedAt: curatedSkills.updatedAt,
      ingestedAt: curatedSkills.ingestedAt,
    })
    .from(curatedSkills)
    .where(
      and(
        eq(curatedSkills.source, "skills.sh"),
        eq(curatedSkills.status, "ingested"),
        isNotNull(curatedSkills.ingestedAt)
      )
    )
    .orderBy(asc(curatedSkills.owner), asc(curatedSkills.repo), asc(curatedSkills.slug))
    .limit(CURATED_LIMIT);

  return rows.map((row) => ({
    owner: row.owner,
    repo: row.repo,
    slug: row.slug,
    updatedAt: row.updatedAt,
  }));
}
