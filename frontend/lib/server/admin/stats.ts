import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import {
  dailyBudget,
  generations,
  lifetimeLicenses,
  subscriptions,
  usageEvents,
  users,
} from "@/lib/server/db/schema";
import { getServerEnv } from "@/lib/server/env";
import { ADMIN } from "@/lib/constants/admin";
import { BILLING, TRACKED_EVENTS } from "@/lib/constants/billing";
import { getBrowser } from "@/lib/server/extractor/browser";
import {
  getCuratedAdminCounts,
  getCuratedTopHosts,
  getRecentCuratedSkills,
} from "@/lib/server/db/queries/curated-skills";
import type {
  AdminCuratedSnapshot,
  AdminDbMetrics,
  AdminDbTable,
  AdminFeedbackEntry,
  AdminHealthCheck,
  AdminModeBreakdown,
  AdminPerDayPoint,
  AdminRecentFailure,
  AdminStatsCounters,
  AdminStatsPayload,
  AdminTopError,
  AdminTopHost,
} from "@/lib/types/admin";

function utcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function readCounters(): Promise<AdminStatsCounters> {
  const db = getDb();
  const env = getServerEnv();
  const today = utcDateString();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [statusRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where status = 'done')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      inFlight: sql<number>`count(*) filter (where status in ('pending','extracting','generating'))::int`,
      uniqueIps: sql<number>`count(distinct ip_hash)::int`,
      totalViews: sql<number>`coalesce(sum(view_count),0)::int`,
    })
    .from(generations);

  const [last24hRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generations)
    .where(gte(generations.createdAt, last24h));

  const [todayRow] = await db
    .select()
    .from(dailyBudget)
    .where(eq(dailyBudget.utcDate, today));

  const [durationRow] = await db
    .select({
      avgSec: sql<number | null>`avg(extract(epoch from (completed_at - started_at)))::float`,
    })
    .from(generations)
    .where(
      and(
        eq(generations.status, "done"),
        isNotNull(generations.startedAt),
        isNotNull(generations.completedAt)
      )
    );

  const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [[usersTotalRow], [usersLast7dRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(users),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.createdAt, last7d)),
  ]);
  const usersRow = {
    total: usersTotalRow?.count ?? 0,
    last7d: usersLast7dRow?.count ?? 0,
  };

  const subStatusRows = await db
    .select({
      plan: subscriptions.plan,
      interval: subscriptions.interval,
      count: sql<number>`count(*)::int`,
    })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"))
    .groupBy(subscriptions.plan, subscriptions.interval);

  const [lifetimeRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(lifetimeLicenses);

  const [[assetPromptTotalRow], [assetPromptLast7dRow]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usageEvents)
      .where(eq(usageEvents.kind, TRACKED_EVENTS.assetPrompt)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(usageEvents)
      .where(
        and(
          eq(usageEvents.kind, TRACKED_EVENTS.assetPrompt),
          gte(usageEvents.createdAt, last7d)
        )
      ),
  ]);

  let activeSubs = 0;
  let monthlyRecurringRevenueCents = 0;
  for (const row of subStatusRows) {
    const intervalLower = row.interval?.toLowerCase() ?? "";
    const isYearly = intervalLower.startsWith("year");
    const pricePerMonth = isYearly
      ? BILLING.proYearlyPriceCents / 12
      : BILLING.proMonthlyPriceCents;
    monthlyRecurringRevenueCents += Math.round(pricePerMonth) * row.count;
    activeSubs += row.count;
  }

  const lifetimeCount = lifetimeRow?.count ?? 0;
  const lifetimeRevenueCents = lifetimeCount * BILLING.ltdPriceCents;
  const totalRevenueCents = lifetimeRevenueCents + monthlyRecurringRevenueCents;

  const total = statusRow?.total ?? 0;
  const done = statusRow?.done ?? 0;
  const failed = statusRow?.failed ?? 0;
  const settled = done + failed;
  const cacheHits = todayRow?.cacheHits ?? 0;
  const generationsToday = todayRow?.generationsStarted ?? 0;
  const requestsToday = generationsToday + cacheHits;
  const tokensUsedToday = todayRow?.tokensUsed ?? 0;
  const tokensBudget = env.DAILY_TOKEN_BUDGET;

  return {
    totalGenerations: total,
    totalDone: done,
    totalFailed: failed,
    totalInFlight: statusRow?.inFlight ?? 0,
    totalViews: statusRow?.totalViews ?? 0,
    uniqueVisitors: statusRow?.uniqueIps ?? 0,
    successRate: settled === 0 ? 0 : done / settled,
    errorRate: settled === 0 ? 0 : failed / settled,
    cacheHits,
    cacheHitRate: requestsToday === 0 ? 0 : cacheHits / requestsToday,
    tokensUsedToday,
    tokensBudget,
    tokensRemaining: Math.max(0, tokensBudget - tokensUsedToday),
    generationsToday,
    generationsLast24h: last24hRow?.count ?? 0,
    averageDurationSec:
      typeof durationRow?.avgSec === "number" ? durationRow.avgSec : null,
    totalUsers: usersRow.total,
    newUsersLast7d: usersRow.last7d,
    totalRevenueCents,
    monthlyRecurringRevenueCents,
    activeSubscriptions: activeSubs,
    lifetimeLicenses: lifetimeCount,
    assetPromptsTotal: assetPromptTotalRow?.count ?? 0,
    assetPromptsLast7d: assetPromptLast7dRow?.count ?? 0,
  };
}

async function readModes(): Promise<AdminModeBreakdown[]> {
  const db = getDb();
  const rows = await db
    .select({
      mode: generations.mode,
      total: sql<number>`count(*)::int`,
      done: sql<number>`count(*) filter (where status = 'done')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
    })
    .from(generations)
    .groupBy(generations.mode)
    .orderBy(desc(sql`count(*)`));
  return rows.map((row) => ({
    mode: row.mode,
    total: row.total,
    done: row.done,
    failed: row.failed,
  }));
}

async function readTopHosts(): Promise<AdminTopHost[]> {
  const db = getDb();
  const rows = await db
    .select({
      host: generations.sourceHost,
      generations: sql<number>`count(*)::int`,
      totalViews: sql<number>`coalesce(sum(view_count),0)::int`,
    })
    .from(generations)
    .groupBy(generations.sourceHost)
    .orderBy(desc(sql`coalesce(sum(view_count),0)`), desc(sql`count(*)`))
    .limit(ADMIN.topHostsLimit);
  return rows
    .filter((row) => row.host && row.host.length > 0)
    .map((row) => ({
      host: row.host,
      generations: row.generations,
      totalViews: row.totalViews,
    }));
}

async function readRecentFailures(): Promise<AdminRecentFailure[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: generations.id,
      sourceHost: generations.sourceHost,
      sourceUrl: generations.sourceUrl,
      mode: generations.mode,
      errorMessage: generations.errorMessage,
      errorCode: generations.errorCode,
      errorDetail: generations.errorDetail,
      createdAt: generations.createdAt,
    })
    .from(generations)
    .where(eq(generations.status, "failed"))
    .orderBy(desc(generations.createdAt))
    .limit(ADMIN.recentFailuresLimit);
  return rows.map((row) => ({
    id: row.id,
    sourceHost: row.sourceHost,
    sourceUrl: row.sourceUrl,
    mode: row.mode,
    errorMessage: row.errorMessage,
    errorCode: row.errorCode,
    errorDetail: row.errorDetail,
    createdAt: row.createdAt.toISOString(),
  }));
}

async function readTopErrors(): Promise<AdminTopError[]> {
  const db = getDb();
  const rows = await db
    .select({
      message: generations.errorMessage,
      count: sql<number>`count(*)::int`,
    })
    .from(generations)
    .where(and(eq(generations.status, "failed"), isNotNull(generations.errorMessage)))
    .groupBy(generations.errorMessage)
    .orderBy(desc(sql`count(*)`))
    .limit(ADMIN.topErrorsLimit);
  return rows
    .filter((row) => row.message)
    .map((row) => ({ message: row.message ?? "", count: row.count }));
}

async function readPerDay(): Promise<AdminPerDayPoint[]> {
  const db = getDb();
  const since = new Date(Date.now() - ADMIN.perDayWindow * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      date: sql<string>`to_char(date_trunc('day', created_at) at time zone 'UTC', 'YYYY-MM-DD')`,
      done: sql<number>`count(*) filter (where status = 'done')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
    })
    .from(generations)
    .where(gte(generations.createdAt, since))
    .groupBy(sql`date_trunc('day', created_at)`)
    .orderBy(sql`date_trunc('day', created_at)`);
  return rows.map((row) => ({
    date: row.date,
    done: row.done,
    failed: row.failed,
  }));
}

async function readHealth(): Promise<AdminHealthCheck[]> {
  const env = getServerEnv();
  const checks: AdminHealthCheck[] = [];

  const dbStart = Date.now();
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    checks.push({
      name: "Database",
      ok: true,
      message: "Connected",
      latencyMs: Date.now() - dbStart,
    });
  } catch (error) {
    checks.push({
      name: "Database",
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error",
      latencyMs: null,
    });
  }

  const r2Start = Date.now();
  try {
    const probeUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/__healthcheck`;
    const response = await fetch(probeUrl, { method: "HEAD", cache: "no-store" });
    const ok = response.status < 500;
    checks.push({
      name: "R2 storage",
      ok,
      message: `HTTP ${response.status}`,
      latencyMs: Date.now() - r2Start,
    });
  } catch (error) {
    checks.push({
      name: "R2 storage",
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error",
      latencyMs: null,
    });
  }

  const aiConfigured =
    env.AI_GEMINI_PROVIDER === "vertex"
      ? Boolean(env.GOOGLE_VERTEX_PROJECT && env.GOOGLE_VERTEX_LOCATION)
      : Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY);
  checks.push({
    name: "AI provider",
    ok: aiConfigured,
    message: aiConfigured
      ? `Configured (${env.AI_GEMINI_PROVIDER})`
      : `Missing config for ${env.AI_GEMINI_PROVIDER}`,
    latencyMs: null,
  });

  checks.push({
    name: "Sentry",
    ok: Boolean(env.SENTRY_DSN),
    message: env.SENTRY_DSN ? "DSN configured" : "Disabled (no DSN)",
    latencyMs: null,
  });

  checks.push({
    name: "Lazy refresh",
    ok: true,
    message: "On-view, 14d stale, 24h cooldown",
    latencyMs: null,
  });

  const browserStart = Date.now();
  try {
    const browser = await getBrowser();
    const ok = browser.isConnected();
    const version = browser.version();
    checks.push({
      name: "Playwright Chromium",
      ok,
      message: ok ? `Connected · ${version}` : "Launched but disconnected",
      latencyMs: Date.now() - browserStart,
    });
  } catch (error) {
    checks.push({
      name: "Playwright Chromium",
      ok: false,
      message: trimMessage(
        error instanceof Error ? error.message : "Launch failed"
      ),
      latencyMs: null,
    });
  }

  return checks;
}

function trimMessage(message: string, max = 120): string {
  const single = message.replace(/\s+/g, " ").trim();
  return single.length > max ? `${single.slice(0, max - 1)}…` : single;
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function readDatabaseMetrics(): Promise<AdminDbMetrics> {
  const db = getDb();
  try {
    const sizeRows = await db.execute(
      sql`select pg_database_size(current_database())::bigint as total`
    );
    const tableRows = await db.execute(
      sql`select
        c.relname as name,
        pg_total_relation_size(c.oid)::bigint as total_size,
        pg_indexes_size(c.oid)::bigint as index_size,
        coalesce(c.reltuples::bigint, 0) as row_count
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
      order by pg_total_relation_size(c.oid) desc`
    );
    const connRows = await db.execute(
      sql`select count(*)::int as count from pg_stat_activity where datname = current_database()`
    );

    const sizeArr = Array.from(sizeRows as ArrayLike<Record<string, unknown>>);
    const connArr = Array.from(connRows as ArrayLike<Record<string, unknown>>);
    const tablesArr = Array.from(
      tableRows as ArrayLike<Record<string, unknown>>
    );

    const totalSizeBytes = toNumber(sizeArr[0]?.total);
    const connectionCount = toNumber(connArr[0]?.count);
    const tables: AdminDbTable[] = tablesArr.map((row) => ({
      name: String(row.name ?? ""),
      totalSizeBytes: toNumber(row.total_size),
      indexSizeBytes: toNumber(row.index_size),
      rowCount: toNumber(row.row_count),
    }));

    return { totalSizeBytes, connectionCount, tables };
  } catch {
    return { totalSizeBytes: 0, connectionCount: 0, tables: [] };
  }
}

async function readRecentFeedback(): Promise<AdminFeedbackEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: generations.id,
      sourceHost: generations.sourceHost,
      sourceUrl: generations.sourceUrl,
      mode: generations.mode,
      status: generations.status,
      feedback: generations.feedback,
      updatedAt: generations.updatedAt,
    })
    .from(generations)
    .where(isNotNull(generations.feedback))
    .orderBy(desc(generations.updatedAt))
    .limit(ADMIN.recentFeedbackLimit);
  return rows
    .filter((row): row is typeof row & { feedback: string } => Boolean(row.feedback))
    .map((row) => ({
      id: row.id,
      sourceHost: row.sourceHost,
      sourceUrl: row.sourceUrl,
      mode: row.mode,
      status: row.status,
      feedback: row.feedback,
      updatedAt: row.updatedAt.toISOString(),
    }));
}

async function readCuratedSnapshot(): Promise<AdminCuratedSnapshot> {
  try {
    const [counts, topHosts, recent] = await Promise.all([
      getCuratedAdminCounts(),
      getCuratedTopHosts(8),
      getRecentCuratedSkills(8),
    ]);
    return {
      counts,
      topHosts,
      recent: recent.map((skill) => ({
        owner: skill.owner,
        repo: skill.repo,
        slug: skill.slug,
        name: skill.name,
        kind: skill.kind === "pending" ? "methodology" : skill.kind,
        canonicalHost: skill.canonicalHost,
        ingestedAt: skill.ingestedAt,
      })),
    };
  } catch {
    return {
      counts: {
        total: 0,
        pending: 0,
        ingested: 0,
        failed: 0,
        skipped: 0,
        docs: 0,
        methodology: 0,
        tooling: 0,
      },
      topHosts: [],
      recent: [],
    };
  }
}

export async function getDashboardStats(): Promise<AdminStatsPayload> {
  const [
    counters,
    modes,
    topHosts,
    recentFailures,
    topErrors,
    perDay,
    health,
    database,
    recentFeedback,
    curated,
  ] = await Promise.all([
    readCounters(),
    readModes(),
    readTopHosts(),
    readRecentFailures(),
    readTopErrors(),
    readPerDay(),
    readHealth(),
    readDatabaseMetrics(),
    readRecentFeedback(),
    readCuratedSnapshot(),
  ]);

  return {
    counters,
    modes,
    topHosts,
    recentFailures,
    topErrors,
    perDay,
    health,
    database,
    recentFeedback,
    curated,
    generatedAt: new Date().toISOString(),
  };
}
