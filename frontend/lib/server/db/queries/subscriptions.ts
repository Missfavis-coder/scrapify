import { and, desc, eq, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  lifetimeDealCounter,
  lifetimeLicenses,
  subscriptions,
  type LifetimeLicenseRow,
  type SubscriptionRow,
} from "@/lib/server/db/schema";
import { LIFETIME_DEAL_COUNTER_ID } from "@/lib/constants/billing";
import { BILLING } from "@/lib/constants/billing";
import type { LifetimeDealStatus } from "@/lib/types/billing";

const SUBSCRIPTION_ID_LENGTH = 21;
const LICENSE_ID_LENGTH = 21;

export async function findActiveSubscriptionByUserId(
  userId: string
): Promise<SubscriptionRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  return row ?? null;
}

export async function findSubscriptionByDodoId(
  dodoSubscriptionId: string
): Promise<SubscriptionRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.dodoSubscriptionId, dodoSubscriptionId))
    .limit(1);
  return row ?? null;
}

interface UpsertSubscriptionInput {
  userId: string;
  dodoSubscriptionId: string;
  productId: string | null;
  plan: string;
  interval: string;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export async function upsertSubscription(
  input: UpsertSubscriptionInput
): Promise<SubscriptionRow> {
  const db = getDb();
  const existing = await findSubscriptionByDodoId(input.dodoSubscriptionId);
  if (existing) {
    const [row] = await db
      .update(subscriptions)
      .set({
        productId: input.productId,
        plan: input.plan,
        interval: input.interval,
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(subscriptions)
    .values({
      id: nanoid(SUBSCRIPTION_ID_LENGTH),
      userId: input.userId,
      dodoSubscriptionId: input.dodoSubscriptionId,
      productId: input.productId,
      plan: input.plan,
      interval: input.interval,
      status: input.status,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    })
    .returning();
  return row;
}

export async function findLifetimeLicenseByUserId(
  userId: string
): Promise<LifetimeLicenseRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(lifetimeLicenses)
    .where(eq(lifetimeLicenses.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function findLifetimeLicenseByDodoPaymentId(
  dodoPaymentId: string
): Promise<LifetimeLicenseRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(lifetimeLicenses)
    .where(eq(lifetimeLicenses.dodoPaymentId, dodoPaymentId))
    .limit(1);
  return row ?? null;
}

interface CreateLifetimeLicenseInput {
  userId: string;
  dodoPaymentId: string;
  productId: string | null;
}

export async function createLifetimeLicense(
  input: CreateLifetimeLicenseInput
): Promise<LifetimeLicenseRow> {
  const db = getDb();
  const [row] = await db
    .insert(lifetimeLicenses)
    .values({
      id: nanoid(LICENSE_ID_LENGTH),
      userId: input.userId,
      dodoPaymentId: input.dodoPaymentId,
      productId: input.productId,
    })
    .returning();
  return row;
}

export async function ensureLifetimeDealCounter(): Promise<void> {
  const db = getDb();
  await db
    .insert(lifetimeDealCounter)
    .values({
      id: LIFETIME_DEAL_COUNTER_ID,
      soldCount: 0,
      cap: BILLING.ltdCap,
    })
    .onConflictDoNothing();
}

export async function getLifetimeDealStatus(): Promise<LifetimeDealStatus> {
  const db = getDb();
  await ensureLifetimeDealCounter();
  const [row] = await db
    .select()
    .from(lifetimeDealCounter)
    .where(eq(lifetimeDealCounter.id, LIFETIME_DEAL_COUNTER_ID))
    .limit(1);
  const soldCount = row?.soldCount ?? 0;
  const cap = row?.cap ?? BILLING.ltdCap;
  return {
    soldCount,
    cap,
    remaining: Math.max(0, cap - soldCount),
    available: soldCount < cap,
  };
}

export async function incrementLifetimeDealCounter(): Promise<LifetimeDealStatus> {
  const db = getDb();
  await ensureLifetimeDealCounter();
  const [row] = await db
    .update(lifetimeDealCounter)
    .set({
      soldCount: sql`${lifetimeDealCounter.soldCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(lifetimeDealCounter.id, LIFETIME_DEAL_COUNTER_ID))
    .returning();
  const soldCount = row?.soldCount ?? 1;
  const cap = row?.cap ?? BILLING.ltdCap;
  return {
    soldCount,
    cap,
    remaining: Math.max(0, cap - soldCount),
    available: soldCount < cap,
  };
}

export async function findSubscriptionByUserAndStatus(
  userId: string,
  status: string
): Promise<SubscriptionRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, status))
    )
    .orderBy(desc(subscriptions.updatedAt))
    .limit(1);
  return row ?? null;
}

const RECONCILE_BATCH_DEFAULT = 200;
const RECONCILE_BATCH_MAX = 1_000;

interface ListReconcileOptions {
  limit?: number;
  before?: Date | null;
}

export async function listReconcileTargetSubscriptions(
  options: number | ListReconcileOptions = {}
): Promise<SubscriptionRow[]> {
  const db = getDb();
  const opts: ListReconcileOptions =
    typeof options === "number" ? { limit: options } : options;
  const limit = Math.max(
    1,
    Math.min(RECONCILE_BATCH_MAX, Math.floor(opts.limit ?? RECONCILE_BATCH_DEFAULT))
  );
  const filters = opts.before ? [lt(subscriptions.updatedAt, opts.before)] : [];
  return db
    .select()
    .from(subscriptions)
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(subscriptions.updatedAt))
    .limit(limit);
}

interface UpdateSubscriptionStatusInput {
  id: string;
  status: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date | null;
}

export async function updateSubscriptionStatus(
  input: UpdateSubscriptionStatusInput
): Promise<void> {
  const db = getDb();
  const set: Partial<typeof subscriptions.$inferInsert> = {
    status: input.status,
    updatedAt: new Date(),
  };
  if (input.cancelAtPeriodEnd !== undefined) {
    set.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
  }
  if (input.currentPeriodEnd !== undefined) {
    set.currentPeriodEnd = input.currentPeriodEnd;
  }
  await db.update(subscriptions).set(set).where(eq(subscriptions.id, input.id));
}
