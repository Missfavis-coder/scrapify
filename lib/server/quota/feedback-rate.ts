import { sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { quotaUsage } from "@/lib/server/db/schema";

const FEEDBACK_HOURLY_LIMIT = 10;
const FEEDBACK_KEY_PREFIX = "fb:";

function startOfHourUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours()
    )
  );
}

export interface FeedbackRateResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export async function checkAndIncrementFeedbackRate(
  ipHash: string
): Promise<FeedbackRateResult> {
  const db = getDb();
  const periodStart = startOfHourUtc();
  const key = `${FEEDBACK_KEY_PREFIX}${ipHash}`;

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
    allowed: used <= FEEDBACK_HOURLY_LIMIT,
    used,
    limit: FEEDBACK_HOURLY_LIMIT,
  };
}
