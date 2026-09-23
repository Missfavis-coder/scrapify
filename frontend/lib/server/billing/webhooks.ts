import type DodoPayments from "dodopayments";
import { getDodoClient } from "@/lib/server/billing/client";
import { getKnownProductIds } from "@/lib/server/billing/products";
import { getServerEnv } from "@/lib/server/env";
import {
  createLifetimeLicense,
  findLifetimeLicenseByDodoPaymentId,
  findSubscriptionByDodoId,
  incrementLifetimeDealCounter,
  upsertSubscription,
} from "@/lib/server/db/queries/subscriptions";
import { findUserById } from "@/lib/server/db/queries/users";
import { sendEmailFireAndForget } from "@/lib/server/email/client";
import * as checkoutTemplate from "@/lib/server/email/templates/checkout-confirmation";
import * as paymentFailedTemplate from "@/lib/server/email/templates/payment-failed";
import * as cancellationTemplate from "@/lib/server/email/templates/cancellation-confirmed";
import * as ltdTemplate from "@/lib/server/email/templates/ltd-purchase";
import { EMAIL, EMAIL_LINKS } from "@/lib/constants/email";
import { SITE } from "@/lib/constants/site";
import { BILLING } from "@/lib/constants/billing";
import { logError, logEvent } from "@/lib/server/logger";
import type { UserRow } from "@/lib/server/db/schema";

type UnwrapEvent = DodoPayments.Webhooks.UnwrapWebhookEvent;

interface WebhookVerifyResult {
  valid: boolean;
  event?: UnwrapEvent;
  error?: string;
}

const DISCORD_REQUEST_TIMEOUT_MS = 5_000;

export function verifyAndUnwrapWebhook(
  payload: string,
  headers: Record<string, string>
): WebhookVerifyResult {
  const env = getServerEnv();
  const key = env.DODO_PAYMENTS_WEBHOOK_SECRET;
  if (!key) {
    return { valid: false, error: "Webhook secret not configured" };
  }
  try {
    const client = getDodoClient();
    const event = client.webhooks.unwrap(payload, { headers, key });
    return { valid: true, event };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface DispatchResult {
  handled: boolean;
  reason?: string;
}

export async function dispatchWebhookEvent(
  event: UnwrapEvent
): Promise<DispatchResult> {
  switch (event.type) {
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.on_hold":
    case "subscription.failed":
    case "subscription.cancelled":
    case "subscription.expired":
    case "subscription.plan_changed":
    case "subscription.updated":
      return handleSubscriptionEvent(event.data, event.type);
    case "payment.succeeded":
      return handlePaymentSucceeded(event.data);
    case "payment.failed":
      return handlePaymentFailed(event.data);
    default:
      return { handled: false, reason: `Unhandled event type ${event.type}` };
  }
}

async function handleSubscriptionEvent(
  subscription: DodoPayments.Subscriptions.Subscription,
  eventType: string
): Promise<DispatchResult> {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    return { handled: false, reason: "Subscription metadata missing user_id" };
  }

  const user = await findUserById(userId);
  if (!user) {
    return { handled: false, reason: `User ${userId} not found` };
  }

  const existing = await findSubscriptionByDodoId(subscription.subscription_id);
  if (existing && existing.status === subscription.status && eventType === "subscription.updated") {
    return { handled: true, reason: "Idempotent skip" };
  }

  const wasActive = existing?.status === "active";
  const wasCancelled = existing?.status === "cancelled";

  await upsertSubscription({
    userId,
    dodoSubscriptionId: subscription.subscription_id,
    productId: subscription.product_id,
    plan: "pro",
    interval: subscription.payment_frequency_interval === "Year" ? "year" : "month",
    status: subscription.status,
    currentPeriodEnd: subscription.next_billing_date
      ? new Date(subscription.next_billing_date)
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_next_billing_date ?? false,
  });

  logEvent("billing.subscription_event", {
    eventType,
    userId,
    status: subscription.status,
    subscriptionId: subscription.subscription_id,
  });

  if (eventType === "subscription.active" && !wasActive) {
    sendCheckoutConfirmation(user, subscription);
    notifyDiscordProRole(user, subscription);
  }

  if (
    eventType === "subscription.cancelled" &&
    !wasCancelled
  ) {
    sendCancellationConfirmed(user, subscription);
  }

  return { handled: true };
}

async function handlePaymentSucceeded(
  payment: DodoPayments.Payments.Payment
): Promise<DispatchResult> {
  const productId = extractFirstProductId(payment);
  const ltdProductId = getKnownProductIds().ltd;

  if (!productId || !ltdProductId || productId !== ltdProductId) {
    return { handled: true, reason: "Not a lifetime deal payment" };
  }

  const userId = payment.metadata?.user_id;
  if (!userId) {
    return { handled: false, reason: "Payment metadata missing user_id" };
  }

  const existing = await findLifetimeLicenseByDodoPaymentId(payment.payment_id);
  if (existing) {
    return { handled: true, reason: "Idempotent skip" };
  }

  const user = await findUserById(userId);
  if (!user) {
    return { handled: false, reason: `User ${userId} not found` };
  }

  await createLifetimeLicense({
    userId,
    dodoPaymentId: payment.payment_id,
    productId,
  });

  try {
    await incrementLifetimeDealCounter();
  } catch (error) {
    logError("billing.ltd_counter_increment_failed", error, {
      userId,
      paymentId: payment.payment_id,
    });
  }

  logEvent("billing.lifetime_license_created", {
    userId,
    paymentId: payment.payment_id,
  });

  sendLtdPurchase(user, payment);

  return { handled: true };
}

async function handlePaymentFailed(
  payment: DodoPayments.Payments.Payment
): Promise<DispatchResult> {
  logEvent("billing.payment_failed", { paymentId: payment.payment_id });
  const userId = payment.metadata?.user_id;
  if (!userId) {
    return { handled: true, reason: "Payment metadata missing user_id" };
  }
  const user = await findUserById(userId);
  if (!user) {
    return { handled: true, reason: `User ${userId} not found` };
  }
  sendPaymentFailed(user);
  return { handled: true };
}

function extractFirstProductId(payment: DodoPayments.Payments.Payment): string | null {
  const productCart = (payment as { product_cart?: Array<{ product_id: string }> }).product_cart;
  if (productCart && productCart.length > 0) {
    return productCart[0].product_id ?? null;
  }
  return null;
}

function displayNameOf(user: UserRow): string | null {
  return user.displayName ?? user.email.split("@")[0] ?? null;
}

function planLabelOf(
  subscription: DodoPayments.Subscriptions.Subscription
): string {
  return subscription.payment_frequency_interval === "Year"
    ? "Pro Yearly"
    : "Pro Monthly";
}

function amountLabelOf(
  subscription: DodoPayments.Subscriptions.Subscription
): string {
  return subscription.payment_frequency_interval === "Year"
    ? `$${BILLING.proYearlyPriceUsd} per year`
    : `$${BILLING.proMonthlyPriceUsd} per month`;
}

function sendCheckoutConfirmation(
  user: UserRow,
  subscription: DodoPayments.Subscriptions.Subscription
): void {
  const dashboardUrl = `${SITE.url}${EMAIL_LINKS.dashboard}`;
  const portalUrl = `${SITE.url}${EMAIL_LINKS.account}`;
  const data = {
    email: user.email,
    displayName: displayNameOf(user),
    planLabel: planLabelOf(subscription),
    amountLabel: amountLabelOf(subscription),
    dashboardUrl,
    invoicePortalUrl: portalUrl,
  };
  sendEmailFireAndForget({
    to: user.email,
    subject: checkoutTemplate.subject(),
    text: checkoutTemplate.text(data),
    html: checkoutTemplate.html(data),
  });
}

function sendCancellationConfirmed(
  user: UserRow,
  subscription: DodoPayments.Subscriptions.Subscription
): void {
  const reactivateUrl = `${SITE.url}${EMAIL_LINKS.account}`;
  const endsAtLabel = subscription.next_billing_date
    ? new Date(subscription.next_billing_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;
  const data = {
    email: user.email,
    displayName: displayNameOf(user),
    endsAtLabel,
    reactivateUrl,
  };
  sendEmailFireAndForget({
    to: user.email,
    subject: cancellationTemplate.subject(),
    text: cancellationTemplate.text(data),
    html: cancellationTemplate.html(data),
  });
}

function sendPaymentFailed(user: UserRow): void {
  const data = {
    email: user.email,
    displayName: displayNameOf(user),
    retryUrl: `${SITE.url}${EMAIL_LINKS.account}`,
    supportEmail: EMAIL.replyTo,
  };
  sendEmailFireAndForget({
    to: user.email,
    subject: paymentFailedTemplate.subject(),
    text: paymentFailedTemplate.text(data),
    html: paymentFailedTemplate.html(data),
  });
}

function sendLtdPurchase(
  user: UserRow,
  payment: DodoPayments.Payments.Payment
): void {
  const receiptUrl =
    (payment as { receipt_url?: string | null }).receipt_url ?? null;
  const data = {
    email: user.email,
    displayName: displayNameOf(user),
    dashboardUrl: `${SITE.url}${EMAIL_LINKS.dashboard}`,
    receiptUrl,
  };
  sendEmailFireAndForget({
    to: user.email,
    subject: ltdTemplate.subject(),
    text: ltdTemplate.text(data),
    html: ltdTemplate.html(data),
  });
}

function notifyDiscordProRole(
  user: UserRow,
  subscription: DodoPayments.Subscriptions.Subscription
): void {
  let webhookUrl: string | undefined;
  try {
    webhookUrl = getServerEnv().DISCORD_PRO_ROLE_WEBHOOK_URL;
  } catch {
    return;
  }
  if (!webhookUrl) return;

  const payload = JSON.stringify({
    userId: user.id,
    email: user.email,
    plan: planLabelOf(subscription),
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DISCORD_REQUEST_TIMEOUT_MS
  );

  void fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    signal: controller.signal,
  })
    .catch((error) => {
      logError("billing.discord_role_failed", error, {
        userId: user.id,
      });
    })
    .finally(() => {
      clearTimeout(timeout);
    });
}
