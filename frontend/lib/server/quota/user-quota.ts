import { getUserEntitlements } from "@/lib/server/billing/entitlements";
import {
  countUserEventsByMetadataKeySince,
  recordUsageEventSafe,
} from "@/lib/server/db/queries/usage-events";
import { BILLING, TRACKED_EVENTS } from "@/lib/constants/billing";
import { MCP_TRANSPORT_ENDPOINT } from "@/lib/constants/api-keys";
import type { BillingPlan, UserEntitlements } from "@/lib/types/billing";

export interface UserQuotaResult {
  allowed: boolean;
  used: number;
  remaining: number;
  limit: number;
  tier: BillingPlan;
}

export async function getUserInitQuotaStatus(
  userId: string
): Promise<UserQuotaResult> {
  const entitlements = await getUserEntitlements(userId);
  return {
    allowed: entitlements.tier !== "free" || entitlements.initsRemaining > 0,
    used: entitlements.initsThisMonth,
    remaining: entitlements.initsRemaining,
    limit: entitlements.initLimit,
    tier: entitlements.tier,
  };
}

interface RecordInitInput {
  userId: string;
  ipHash: string | null;
  cookieKey: string | null;
  metadata: Record<string, unknown> | null;
}

export async function recordInitEvent(input: RecordInitInput): Promise<void> {
  await recordUsageEventSafe({
    kind: TRACKED_EVENTS.cliInit,
    userId: input.userId,
    ipHash: input.ipHash,
    cookieKey: input.cookieKey,
    metadata: input.metadata,
  });
}

export async function checkAndRecordInit(input: RecordInitInput): Promise<UserQuotaResult> {
  const status = await getUserInitQuotaStatus(input.userId);
  if (!status.allowed) return status;
  await recordInitEvent(input);
  return {
    ...status,
    used: status.used + 1,
    remaining: Math.max(0, status.remaining - 1),
  };
}

export function entitlementsToWebGenerateStatus(
  entitlements: UserEntitlements
): UserQuotaResult {
  return {
    allowed:
      entitlements.tier !== "free" || entitlements.webGeneratesRemaining > 0,
    used: entitlements.webGeneratesThisMonth,
    remaining: entitlements.webGeneratesRemaining,
    limit: entitlements.webGenerateLimit,
    tier: entitlements.tier,
  };
}

export async function getUserWebGenerateQuotaStatus(
  userId: string
): Promise<UserQuotaResult> {
  const entitlements = await getUserEntitlements(userId);
  return entitlementsToWebGenerateStatus(entitlements);
}

interface RecordWebGenerateInput {
  userId: string;
  ipHash: string | null;
  cookieKey: string | null;
  metadata: Record<string, unknown> | null;
}

export async function recordWebGenerateEvent(
  input: RecordWebGenerateInput
): Promise<void> {
  await recordUsageEventSafe({
    kind: TRACKED_EVENTS.webGenerate,
    userId: input.userId,
    ipHash: input.ipHash,
    cookieKey: input.cookieKey,
    metadata: input.metadata,
  });
}

export const FREE_TIER_INIT_LIMIT = BILLING.freeInitsPerMonth;
export const FREE_TIER_WEB_GENERATE_LIMIT = BILLING.freeWebGeneratesPerMonth;
export const FREE_TIER_MCP_DAILY_LIMIT = BILLING.freeMcpCallsPerDay;

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

export async function getUserMcpDailyQuotaStatus(
  userId: string
): Promise<UserQuotaResult> {
  const entitlements = await getUserEntitlements(userId);
  const usedToday = await countUserEventsByMetadataKeySince(
    userId,
    TRACKED_EVENTS.apiKeyUsed,
    "endpoint",
    MCP_TRANSPORT_ENDPOINT,
    startOfUtcDay()
  );
  const limit =
    entitlements.tier === "free"
      ? BILLING.freeMcpCallsPerDay
      : BILLING.proMcpCallsPerDay;
  const remaining = Math.max(0, limit - usedToday);
  return {
    allowed: entitlements.tier !== "free" || remaining > 0,
    used: usedToday,
    remaining,
    limit,
    tier: entitlements.tier,
  };
}
