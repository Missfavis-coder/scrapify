import { getServerEnv } from "@/lib/server/env";
import { BILLING_PRODUCT_KEYS } from "@/lib/constants/billing";
import type { CheckoutPlanKey } from "@/lib/types/billing";

export interface ResolvedProduct {
  productId: string;
  envKey: string;
  isRecurring: boolean;
  interval: "Month" | "Year" | null;
}

export function resolveProductForPlan(plan: CheckoutPlanKey): ResolvedProduct {
  const env = getServerEnv();
  if (plan === "pro_monthly") {
    return requireProduct({
      envKey: BILLING_PRODUCT_KEYS.proMonthly,
      productId: env.DODO_PRODUCT_PRO_MONTHLY,
      isRecurring: true,
      interval: "Month",
    });
  }
  if (plan === "pro_yearly") {
    return requireProduct({
      envKey: BILLING_PRODUCT_KEYS.proYearly,
      productId: env.DODO_PRODUCT_PRO_YEARLY,
      isRecurring: true,
      interval: "Year",
    });
  }
  return requireProduct({
    envKey: BILLING_PRODUCT_KEYS.ltd,
    productId: env.DODO_PRODUCT_LTD,
    isRecurring: false,
    interval: null,
  });
}

function requireProduct(input: {
  envKey: string;
  productId: string | undefined;
  isRecurring: boolean;
  interval: "Month" | "Year" | null;
}): ResolvedProduct {
  if (!input.productId) {
    throw new Error(`Missing product id for ${input.envKey}. Run pnpm dodo:create.`);
  }
  return {
    productId: input.productId,
    envKey: input.envKey,
    isRecurring: input.isRecurring,
    interval: input.interval,
  };
}

export function getKnownProductIds(): {
  proMonthly: string | null;
  proYearly: string | null;
  ltd: string | null;
} {
  const env = getServerEnv();
  return {
    proMonthly: env.DODO_PRODUCT_PRO_MONTHLY ?? null,
    proYearly: env.DODO_PRODUCT_PRO_YEARLY ?? null,
    ltd: env.DODO_PRODUCT_LTD ?? null,
  };
}
