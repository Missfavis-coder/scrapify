import { getDodoClient } from "@/lib/server/billing/client";
import { resolveProductForPlan } from "@/lib/server/billing/products";
import { getLifetimeDealStatus } from "@/lib/server/db/queries/subscriptions";
import {
  findUserById,
  updateUserDodoCustomerId,
} from "@/lib/server/db/queries/users";
import { getPublicSiteUrl } from "@/lib/utils/url";
import type {
  CheckoutPlanKey,
  DodoCheckoutSessionResult,
} from "@/lib/types/billing";

export class LifetimeDealSoldOutError extends Error {
  code: string;
  constructor() {
    super("The lifetime deal is sold out.");
    this.name = "LifetimeDealSoldOutError";
    this.code = "LTD_SOLD_OUT";
  }
}

interface CheckoutInput {
  userId: string;
  userEmail: string;
  plan: CheckoutPlanKey;
  successUrl?: string;
}

export async function createCheckoutSession(
  input: CheckoutInput
): Promise<DodoCheckoutSessionResult> {
  const product = resolveProductForPlan(input.plan);

  if (input.plan === "ltd") {
    const status = await getLifetimeDealStatus();
    if (!status.available) {
      throw new LifetimeDealSoldOutError();
    }
  }

  const customerId = await ensureDodoCustomer({
    userId: input.userId,
    userEmail: input.userEmail,
  });

  const client = getDodoClient();
  const successUrl =
    input.successUrl ?? `${getPublicSiteUrl()}/account?status=success`;

  const sessionConfig = {
    product_cart: [{ product_id: product.productId, quantity: 1 }],
    customer: customerId
      ? { customer_id: customerId }
      : { email: input.userEmail },
    return_url: successUrl,
    metadata: {
      user_id: input.userId,
      plan: input.plan,
    },
  };

  try {
    const session = await client.checkoutSessions.create(sessionConfig);
    return {
      sessionId: session.session_id,
      url: session.checkout_url ?? "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const isStaleCustomer = message.includes("404") && customerId !== null;
    if (isStaleCustomer) {
      const fresh = await createDodoCustomer({
        userId: input.userId,
        userEmail: input.userEmail,
      });
      const retryConfig = {
        ...sessionConfig,
        customer: fresh
          ? { customer_id: fresh }
          : { email: input.userEmail },
      };
      const session = await client.checkoutSessions.create(retryConfig);
      return {
        sessionId: session.session_id,
        url: session.checkout_url ?? "",
      };
    }
    throw error;
  }
}

interface DodoCustomerInput {
  userId: string;
  userEmail: string;
}

async function ensureDodoCustomer(
  input: DodoCustomerInput
): Promise<string | null> {
  const user = await findUserById(input.userId);
  if (user?.dodoCustomerId) return user.dodoCustomerId;
  return createDodoCustomer(input);
}

async function createDodoCustomer(
  input: DodoCustomerInput
): Promise<string | null> {
  const client = getDodoClient();
  const customerName = input.userEmail.split("@")[0] || "User";
  const created = await client.customers.create({
    name: customerName,
    email: input.userEmail,
    metadata: { user_id: input.userId },
  });
  const customerId = created.customer_id;
  if (customerId) {
    await updateUserDodoCustomerId(input.userId, customerId);
  }
  return customerId ?? null;
}
