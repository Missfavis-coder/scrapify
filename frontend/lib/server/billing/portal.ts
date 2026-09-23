import { getDodoClient } from "@/lib/server/billing/client";
import type { DodoCustomerPortalResult } from "@/lib/types/billing";

export async function createCustomerPortalSession(
  customerId: string
): Promise<DodoCustomerPortalResult> {
  const client = getDodoClient();
  const portal = await client.customers.customerPortal.create(customerId);
  return { url: portal.link };
}
