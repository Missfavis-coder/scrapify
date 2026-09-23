import { sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { quotaUsage } from "@/lib/server/db/schema";
import { LIMITS } from "@/lib/constants/limits";

function startOfDayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
}

export async function checkAndIncrementIpQuota(ipHash: string): Promise<QuotaResult> {
  const db = getDb();
  const periodStart = startOfDayUtc();
  const limit = LIMITS.anonymousPerDay;

  const [row] = await db
    .insert(quotaUsage)
    .values({ ipHash, periodStart, count: 1 })
    .onConflictDoUpdate({
      target: [quotaUsage.ipHash, quotaUsage.periodStart],
      set: { count: sql`${quotaUsage.count} + 1` },
    })
    .returning({ count: quotaUsage.count });

  const used = row?.count ?? 1;
  if (used > limit) {
    return { allowed: false, remaining: 0, used, limit };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - used),
    used,
    limit,
  };
}

export interface IdentityQuotaInput {
  cookieKey: string;
  ipBlockKey: string;
}

export interface IdentityQuotaResult {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  blockedBy: "cookie" | "ip-block" | null;
}

export async function checkAndIncrementIdentityQuota(
  input: IdentityQuotaInput,
): Promise<IdentityQuotaResult> {
  const db = getDb();
  const periodStart = startOfDayUtc();
  const cookieLimit = LIMITS.anonymousPerDay;
  const ipBlockLimit = LIMITS.anonymousPerDayPerIpBlock;

  const [cookieRow, ipBlockRow] = await Promise.all([
    db
      .insert(quotaUsage)
      .values({ ipHash: input.cookieKey, periodStart, count: 1 })
      .onConflictDoUpdate({
        target: [quotaUsage.ipHash, quotaUsage.periodStart],
        set: { count: sql`${quotaUsage.count} + 1` },
      })
      .returning({ count: quotaUsage.count }),
    db
      .insert(quotaUsage)
      .values({ ipHash: input.ipBlockKey, periodStart, count: 1 })
      .onConflictDoUpdate({
        target: [quotaUsage.ipHash, quotaUsage.periodStart],
        set: { count: sql`${quotaUsage.count} + 1` },
      })
      .returning({ count: quotaUsage.count }),
  ]);

  const cookieUsed = cookieRow[0]?.count ?? 1;
  const ipBlockUsed = ipBlockRow[0]?.count ?? 1;

  const cookieExceeded = cookieUsed > cookieLimit;
  const ipBlockExceeded = ipBlockUsed > ipBlockLimit;

  if (cookieExceeded || ipBlockExceeded) {
    return {
      allowed: false,
      remaining: 0,
      used: cookieUsed,
      limit: cookieLimit,
      blockedBy: cookieExceeded ? "cookie" : "ip-block",
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, cookieLimit - cookieUsed),
    used: cookieUsed,
    limit: cookieLimit,
    blockedBy: null,
  };
}
