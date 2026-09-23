import { sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { quotaUsage } from "@/lib/server/db/schema";
import {
  OAUTH_REGISTRATION_QUOTA_KEY_PREFIX,
  OAUTH_REGISTRATION_RATE_LIMIT,
  OAUTH_REGISTRATION_RATE_WINDOW_SECONDS,
} from "@/lib/constants/oauth";

const WINDOW_MS = OAUTH_REGISTRATION_RATE_WINDOW_SECONDS * 1000;

function startOfHourUtc(now: Date): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );
}

function secondsUntilWindowReset(periodStart: Date, now: Date): number {
  const resetAt = periodStart.getTime() + WINDOW_MS;
  return Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000));
}

export interface OAuthRegisterQuotaResult {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  retryAfterSeconds: number;
}

export async function checkAndIncrementOAuthRegisterQuota(
  ipHash: string
): Promise<OAuthRegisterQuotaResult> {
  const db = getDb();
  const now = new Date();
  const periodStart = startOfHourUtc(now);
  const limit = OAUTH_REGISTRATION_RATE_LIMIT;
  const key = `${OAUTH_REGISTRATION_QUOTA_KEY_PREFIX}${ipHash}`;

  const [row] = await db
    .insert(quotaUsage)
    .values({ ipHash: key, periodStart, count: 1 })
    .onConflictDoUpdate({
      target: [quotaUsage.ipHash, quotaUsage.periodStart],
      set: { count: sql`${quotaUsage.count} + 1` },
    })
    .returning({ count: quotaUsage.count });

  const used = row?.count ?? 1;

  return {
    allowed: used <= limit,
    remaining: Math.max(0, limit - used),
    used,
    limit,
    retryAfterSeconds: secondsUntilWindowReset(periodStart, now),
  };
}
