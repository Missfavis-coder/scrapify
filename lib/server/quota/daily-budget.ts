import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { dailyBudget } from "@/lib/server/db/schema";
import { getServerEnv } from "@/lib/server/env";

export interface DailyBudgetState {
  utcDate: string;
  tokensUsed: number;
  budget: number;
  exceeded: boolean;
  retryAfterSeconds: number;
}

function utcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function secondsUntilNextUtcMidnight(now: Date = new Date()): number {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

export async function getDailyBudgetState(): Promise<DailyBudgetState> {
  const db = getDb();
  const env = getServerEnv();
  const utcDate = utcDateString();

  const [row] = await db
    .select()
    .from(dailyBudget)
    .where(eq(dailyBudget.utcDate, utcDate));

  const tokensUsed = row?.tokensUsed ?? 0;
  const budget = env.DAILY_TOKEN_BUDGET;

  return {
    utcDate,
    tokensUsed,
    budget,
    exceeded: tokensUsed >= budget,
    retryAfterSeconds: secondsUntilNextUtcMidnight(),
  };
}

export async function addDailyBudgetTokens(tokens: number): Promise<void> {
  if (!Number.isFinite(tokens) || tokens <= 0) return;
  const db = getDb();
  const utcDate = utcDateString();
  const delta = Math.round(tokens);

  await db
    .insert(dailyBudget)
    .values({ utcDate, tokensUsed: delta })
    .onConflictDoUpdate({
      target: dailyBudget.utcDate,
      set: { tokensUsed: sql`${dailyBudget.tokensUsed} + ${delta}` },
    });
}

export async function incrementGenerationsStarted(): Promise<void> {
  const db = getDb();
  const utcDate = utcDateString();
  await db
    .insert(dailyBudget)
    .values({ utcDate, generationsStarted: 1 })
    .onConflictDoUpdate({
      target: dailyBudget.utcDate,
      set: { generationsStarted: sql`${dailyBudget.generationsStarted} + 1` },
    });
}

export async function incrementCacheHits(): Promise<void> {
  const db = getDb();
  const utcDate = utcDateString();
  await db
    .insert(dailyBudget)
    .values({ utcDate, cacheHits: 1 })
    .onConflictDoUpdate({
      target: dailyBudget.utcDate,
      set: { cacheHits: sql`${dailyBudget.cacheHits} + 1` },
    });
}
