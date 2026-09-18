import { sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { hostQuotaUsage } from "@/lib/server/db/schema";
import { getServerEnv } from "@/lib/server/env";

function startOfDayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export interface HostQuotaResult {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
}

export async function checkAndIncrementHostQuota(
  sourceHost: string
): Promise<HostQuotaResult> {
  const db = getDb();
  const periodStart = startOfDayUtc();
  const limit = getServerEnv().HOST_DAILY_LIMIT;
  const normalized = sourceHost.toLowerCase();

  const [row] = await db
    .insert(hostQuotaUsage)
    .values({ sourceHost: normalized, periodStart, count: 1 })
    .onConflictDoUpdate({
      target: [hostQuotaUsage.sourceHost, hostQuotaUsage.periodStart],
      set: { count: sql`${hostQuotaUsage.count} + 1` },
    })
    .returning({ count: hostQuotaUsage.count });

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
