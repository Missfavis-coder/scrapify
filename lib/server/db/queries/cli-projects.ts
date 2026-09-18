import { and, desc, eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import { cliProjects, type CliProjectRow } from "@/lib/server/db/schema";
import {
  CLI_PROJECT_ID_LENGTH,
  DASHBOARD_LIMITS,
} from "@/lib/constants/dashboard";
import type { DashboardProject } from "@/lib/types/dashboard";

interface RecordCliInitInput {
  userId: string;
  slug: string;
  projectName?: string | null;
  templateName?: string | null;
}

export async function recordCliInit(
  input: RecordCliInitInput
): Promise<CliProjectRow> {
  const db = getDb();
  const [row] = await db
    .insert(cliProjects)
    .values({
      id: nanoid(CLI_PROJECT_ID_LENGTH),
      userId: input.userId,
      slug: input.slug,
      projectName: input.projectName ?? null,
      templateName: input.templateName ?? null,
    })
    .returning();
  return row;
}

export async function markProjectSynced(
  userId: string,
  slug: string
): Promise<CliProjectRow | null> {
  const db = getDb();
  const [latest] = await db
    .select({ id: cliProjects.id })
    .from(cliProjects)
    .where(and(eq(cliProjects.userId, userId), eq(cliProjects.slug, slug)))
    .orderBy(desc(cliProjects.generatedAt))
    .limit(1);

  if (!latest) return null;

  const [updated] = await db
    .update(cliProjects)
    .set({ lastSyncedAt: new Date() })
    .where(eq(cliProjects.id, latest.id))
    .returning();
  return updated ?? null;
}

export interface ListProjectsOptions {
  cursor?: string | null;
  limit?: number | null;
}

export async function listProjects(
  userId: string,
  options: ListProjectsOptions = {}
): Promise<{ items: DashboardProject[]; nextCursor: string | null }> {
  const db = getDb();
  const limit = clampLimit(options.limit);
  const cursor = parseCursor(options.cursor);

  const filters = [eq(cliProjects.userId, userId)];
  if (cursor) filters.push(lt(cliProjects.generatedAt, cursor));

  const rows = await db
    .select()
    .from(cliProjects)
    .where(and(...filters))
    .orderBy(desc(cliProjects.generatedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const trimmed = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor =
    hasMore && trimmed.length > 0
      ? trimmed[trimmed.length - 1].generatedAt.toISOString()
      : null;

  return {
    items: trimmed.map(toDashboardProject),
    nextCursor,
  };
}

function toDashboardProject(row: CliProjectRow): DashboardProject {
  return {
    id: row.id,
    slug: row.slug,
    projectName: row.projectName,
    templateName: row.templateName,
    generatedAt: row.generatedAt.toISOString(),
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
  };
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
