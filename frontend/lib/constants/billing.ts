export const BILLING = {
  proMonthlyPriceUsd: 5.99,
  proYearlyPriceUsd: 59,
  ltdPriceUsd: 59,
  proMonthlyPriceCents: 599,
  proYearlyPriceCents: 5900,
  ltdPriceCents: 5900,
  ltdCap: 500,
  freeInitsPerMonth: 3,
  proInitsPerMonth: 1_000_000,
  freeInspirationsPerMonth: 3,
  proInspirationsPerMonth: 1_000_000,
  freeWebGeneratesPerMonth: 10,
  proWebGeneratesPerMonth: 1_000_000,
  freeMcpCallsPerDay: 10,
  proMcpCallsPerDay: 1_000_000,
  freeApiKeyLimit: 1,
  proApiKeyLimit: 1_000_000,
  trialPeriodDays: 0,
} as const;

export const BILLING_PRODUCT_KEYS = {
  proMonthly: "DODO_PRODUCT_PRO_MONTHLY",
  proYearly: "DODO_PRODUCT_PRO_YEARLY",
  ltd: "DODO_PRODUCT_LTD",
} as const;

export const BILLING_PRODUCTS = {
  proMonthly: {
    envKey: BILLING_PRODUCT_KEYS.proMonthly,
    name: "skillmd Pro - Monthly",
    description: "Unlimited skill generations and project initializations",
    currency: "USD" as const,
    priceCents: BILLING.proMonthlyPriceCents,
    interval: "Month" as const,
  },
  proYearly: {
    envKey: BILLING_PRODUCT_KEYS.proYearly,
    name: "skillmd Pro - Yearly",
    description: "Unlimited generations, billed yearly (2 months free)",
    currency: "USD" as const,
    priceCents: BILLING.proYearlyPriceCents,
    interval: "Year" as const,
  },
  ltd: {
    envKey: BILLING_PRODUCT_KEYS.ltd,
    name: "skillmd Lifetime Deal",
    description: "One-time payment, lifetime access to Pro features",
    currency: "USD" as const,
    priceCents: BILLING.ltdPriceCents,
  },
} as const;

export const SESSION_COOKIE_NAME = "gskmd_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 60;
export const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 7;
export const RETURNING_USER_COOKIE_NAME = "gskmd_returning";
export const RETURNING_USER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const DEVICE_CODE_TTL_SECONDS = 60 * 15;
export const DEVICE_CODE_POLL_INTERVAL_SECONDS = 4;
export const CLI_TOKEN_PREFIX = "gskmd_";
export const LIFETIME_DEAL_COUNTER_ID = "default";

export type CheckoutPlanKey = "pro_monthly" | "pro_yearly" | "ltd";

export const CHECKOUT_PLAN_KEYS = ["pro_monthly", "pro_yearly", "ltd"] as const;

export type DodoEventType =
  | "subscription.active"
  | "subscription.cancelled"
  | "subscription.expired"
  | "subscription.on_hold"
  | "subscription.failed"
  | "subscription.renewed"
  | "payment.succeeded"
  | "payment.failed";

export const TRACKED_EVENTS = {
  cliInit: "cli.init",
  cliAdd: "cli.add",
  cliSync: "cli.sync",
  webGenerate: "web.generate",
  authSignin: "auth.signin",
  billingCheckoutStarted: "billing.checkout_started",
  billingCheckoutCompleted: "billing.checkout_completed",
  inspirationCreated: "inspiration.created",
  aiIteration: "ai.iteration",
  apiKeyUsed: "api_key.used",
  assetPrompt: "asset.prompt",
} as const;


export const PRO_PAGE_COPY = {
  currentPlan: "Pricing",
  
} as const;