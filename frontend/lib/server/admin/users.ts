import { and, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import {
  bookmarks,
  cliProjects,
  generationArtifacts,
  generations,
  lifetimeLicenses,
  subscriptions,
  usageEvents,
  users,
} from "@/lib/server/db/schema";
import type {
  AdminUserDetail,
  AdminUserEntry,
  AdminUsersPagePayload,
} from "@/lib/types/admin";

const RECENT_GENERATIONS_LIMIT = 10;
const RECENT_ACTIVITY_LIMIT = 25;

interface ListUsersInput {
  page: number;
  pageSize: number;
  search: string;
}

function deriveDisplayName(row: {
  displayName: string | null;
  email: string;
}): string {
  return row.displayName ?? row.email.split("@")[0] ?? "Member";
}

function deriveProvider(row: {
  tekcifyId: string | null;
}): "tekcify" | "email" {
  return row.tekcifyId ? "tekcify" : "email";
}

export async function listAdminUsersPage(
  input: ListUsersInput
): Promise<AdminUsersPagePayload> {
  const db = getDb();
  const searchTerm = input.search.trim();
  const page = Math.max(1, input.page);
  const pageSize = Math.max(1, Math.min(100, input.pageSize));
  const offset = (page - 1) * pageSize;

  const searchCondition =
    searchTerm.length > 0
      ? or(
          ilike(users.email, `%${searchTerm}%`),
          ilike(users.displayName, `%${searchTerm}%`)
        )
      : undefined;

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      tekcifyId: users.tekcifyId,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      subscriptionPlan: subscriptions.plan,
      subscriptionStatus: subscriptions.status,
      subscriptionInterval: subscriptions.interval,
      subscriptionCurrentPeriodEnd: subscriptions.currentPeriodEnd,
      subscriptionCancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      hasLifetime: sql<boolean>`exists(select 1 from ${lifetimeLicenses} ll where ll.user_id = ${users.id})`,
      generationsCount: sql<number>`(select count(*)::int from ${generations} g where g.user_id = ${users.id})`,
      bookmarksCount: sql<number>`(select count(*)::int from ${bookmarks} b where b.user_id = ${users.id})`,
      cliProjectsCount: sql<number>`(select count(*)::int from ${cliProjects} c where c.user_id = ${users.id})`,
      lastSeenAt: sql<Date | null>`(select max(created_at) from ${usageEvents} e where e.user_id = ${users.id})`,
    })
    .from(users)
    .leftJoin(
      subscriptions,
      and(
        eq(subscriptions.userId, users.id),
        eq(subscriptions.status, "active")
      )
    )
    .where(searchCondition)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(searchCondition);

  const [proCountRow] = await db
    .select({
      proCount: sql<number>`(
        select count(distinct user_id)::int from ${subscriptions} where status = 'active'
      ) + (
        select count(distinct user_id)::int from ${lifetimeLicenses}
      )`,
    })
    .from(users)
    .limit(1);

  const total = totalRow?.count ?? 0;
  const proCount = proCountRow?.proCount ?? 0;

  const entries: AdminUserEntry[] = rows.map((row) => {
    const isPro =
      Boolean(row.hasLifetime) ||
      (row.subscriptionStatus !== null && row.subscriptionStatus === "active");
    return {
      id: row.id,
      email: row.email,
      displayName: deriveDisplayName(row),
      avatarUrl: row.avatarUrl,
      provider: deriveProvider(row),
      createdAt: row.createdAt.toISOString(),
      lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : null,
      generationsCount: row.generationsCount ?? 0,
      bookmarksCount: row.bookmarksCount ?? 0,
      cliProjectsCount: row.cliProjectsCount ?? 0,
      subscriptionPlan: row.subscriptionPlan,
      subscriptionStatus: row.subscriptionStatus,
      subscriptionInterval: row.subscriptionInterval,
      subscriptionCurrentPeriodEnd: row.subscriptionCurrentPeriodEnd
        ? row.subscriptionCurrentPeriodEnd.toISOString()
        : null,
      cancelAtPeriodEnd: Boolean(row.subscriptionCancelAtPeriodEnd),
      hasLifetimeLicense: Boolean(row.hasLifetime),
      isPro,
    };
  });

  return {
    entries,
    total,
    page,
    pageSize,
    search: searchTerm,
    proCount,
    freeCount: Math.max(0, total - proCount),
  };
}

export async function getAdminUserDetail(
  id: string
): Promise<AdminUserDetail | null> {
  const db = getDb();
  const [base] = await db
    .select({
      id: users.id,
      email: users.email,
      tekcifyId: users.tekcifyId,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      subscriptionPlan: subscriptions.plan,
      subscriptionStatus: subscriptions.status,
      subscriptionInterval: subscriptions.interval,
      subscriptionCurrentPeriodEnd: subscriptions.currentPeriodEnd,
      subscriptionCancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      hasLifetime: sql<boolean>`exists(select 1 from ${lifetimeLicenses} ll where ll.user_id = ${users.id})`,
      generationsCount: sql<number>`(select count(*)::int from ${generations} g where g.user_id = ${users.id})`,
      bookmarksCount: sql<number>`(select count(*)::int from ${bookmarks} b where b.user_id = ${users.id})`,
      cliProjectsCount: sql<number>`(select count(*)::int from ${cliProjects} c where c.user_id = ${users.id})`,
      lastSeenAt: sql<Date | null>`(select max(created_at) from ${usageEvents} e where e.user_id = ${users.id})`,
    })
    .from(users)
    .leftJoin(
      subscriptions,
      and(
        eq(subscriptions.userId, users.id),
        eq(subscriptions.status, "active")
      )
    )
    .where(eq(users.id, id))
    .limit(1);

  if (!base) return null;

  const recentGenerationsRows = await db
    .select({
      id: generations.id,
      sourceHost: generations.sourceHost,
      sourceUrl: generations.sourceUrl,
      mode: generations.mode,
      status: generations.status,
      viewCount: generations.viewCount,
      createdAt: generations.createdAt,
      skillName: generationArtifacts.skillName,
    })
    .from(generations)
    .leftJoin(
      generationArtifacts,
      eq(generationArtifacts.generationId, generations.id)
    )
    .where(eq(generations.userId, id))
    .orderBy(desc(generations.createdAt))
    .limit(RECENT_GENERATIONS_LIMIT);

  const activityRows = await db
    .select({
      id: usageEvents.id,
      kind: usageEvents.kind,
      metadata: usageEvents.metadata,
      createdAt: usageEvents.createdAt,
    })
    .from(usageEvents)
    .where(and(eq(usageEvents.userId, id), isNotNull(usageEvents.kind)))
    .orderBy(desc(usageEvents.createdAt))
    .limit(RECENT_ACTIVITY_LIMIT);

  const isPro =
    Boolean(base.hasLifetime) ||
    (base.subscriptionStatus !== null && base.subscriptionStatus === "active");

  return {
    id: base.id,
    email: base.email,
    displayName: deriveDisplayName(base),
    avatarUrl: base.avatarUrl,
    provider: deriveProvider(base),
    createdAt: base.createdAt.toISOString(),
    lastSeenAt: base.lastSeenAt ? new Date(base.lastSeenAt).toISOString() : null,
    generationsCount: base.generationsCount ?? 0,
    bookmarksCount: base.bookmarksCount ?? 0,
    cliProjectsCount: base.cliProjectsCount ?? 0,
    subscriptionPlan: base.subscriptionPlan,
    subscriptionStatus: base.subscriptionStatus,
    subscriptionInterval: base.subscriptionInterval,
    subscriptionCurrentPeriodEnd: base.subscriptionCurrentPeriodEnd
      ? base.subscriptionCurrentPeriodEnd.toISOString()
      : null,
    cancelAtPeriodEnd: Boolean(base.subscriptionCancelAtPeriodEnd),
    hasLifetimeLicense: Boolean(base.hasLifetime),
    isPro,
    recentGenerations: recentGenerationsRows.map((row) => ({
      id: row.id,
      sourceHost: row.sourceHost,
      sourceUrl: row.sourceUrl,
      mode: row.mode,
      status: row.status,
      viewCount: row.viewCount,
      skillName: row.skillName,
      createdAt: row.createdAt.toISOString(),
    })),
    recentActivity: activityRows.map((row) => ({
      id: row.id,
      kind: row.kind,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
