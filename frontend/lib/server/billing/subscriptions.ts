import { getDodoClient } from "@/lib/server/billing/client";
import type {
  DodoSubscriptionDetails,
  SubscriptionStatus,
} from "@/lib/types/billing";

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  const client = getDodoClient();
  await client.subscriptions.update(subscriptionId, {
    cancel_at_next_billing_date: true,
  });
}

export async function getSubscription(
  subscriptionId: string
): Promise<DodoSubscriptionDetails | null> {
  const client = getDodoClient();
  try {
    const subscription = await client.subscriptions.retrieve(subscriptionId);
    return {
      id: subscription.subscription_id,
      status: subscription.status as SubscriptionStatus,
      currentPeriodEnd: subscription.next_billing_date
        ? new Date(subscription.next_billing_date)
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_next_billing_date ?? false,
    };
  } catch {
    return null;
  }
}
