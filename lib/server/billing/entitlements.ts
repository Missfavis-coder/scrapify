import {
  findActiveSubscriptionByUserId,
  findLifetimeLicenseByUserId,
} from "@/lib/server/db/queries/subscriptions";
import { countUserEventsSince } from "@/lib/server/db/queries/usage-events";
import { BILLING, TRACKED_EVENTS } from "@/lib/constants/billing";
import type {
  BillingPlan,
  SubscriptionStatus,
  UserEntitlements,
} from "@/lib/types/billing";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "active",
  "pending",
]);

function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getUserEntitlements(
  userId: string
): Promise<UserEntitlements> {
  const periodStart = startOfMonthUtc();
  const [subscription, lifetime, initsThisMonth, webGeneratesThisMonth] =
    await Promise.all([
      findActiveSubscriptionByUserId(userId),
      findLifetimeLicenseByUserId(userId),
      countUserEventsSince(userId, TRACKED_EVENTS.cliInit, periodStart),
      countUserEventsSince(userId, TRACKED_EVENTS.webGenerate, periodStart),
    ]);

  const subscriptionStatus = subscription?.status as
    | SubscriptionStatus
    | undefined;
  const hasActiveSubscription =
    subscriptionStatus !== undefined &&
    ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus);
  const hasLifetimeLicense = Boolean(lifetime);

  const tier: BillingPlan = hasLifetimeLicense
    ? "ltd"
    : hasActiveSubscription
      ? "pro"
      : "free";

  const initLimit =
    tier === "free" ? BILLING.freeInitsPerMonth : BILLING.proInitsPerMonth;
  const initsRemaining = Math.max(0, initLimit - initsThisMonth);

  const webGenerateLimit =
    tier === "free"
      ? BILLING.freeWebGeneratesPerMonth
      : BILLING.proWebGeneratesPerMonth;
  const webGeneratesRemaining = Math.max(
    0,
    webGenerateLimit - webGeneratesThisMonth
  );

  return {
    tier,
    initsThisMonth,
    initLimit,
    initsRemaining,
    webGeneratesThisMonth,
    webGenerateLimit,
    webGeneratesRemaining,
    hasActiveSubscription,
    hasLifetimeLicense,
    subscriptionId: subscription?.dodoSubscriptionId ?? null,
    subscriptionStatus: subscriptionStatus ?? null,
    subscriptionEndsAt: subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
  };
}

export function isInitAllowed(entitlements: UserEntitlements): boolean {
  if (entitlements.tier !== "free") return true;
  return entitlements.initsRemaining > 0;
}

export function isWebGenerateAllowed(entitlements: UserEntitlements): boolean {
  if (entitlements.tier !== "free") return true;
  return entitlements.webGeneratesRemaining > 0;
}
