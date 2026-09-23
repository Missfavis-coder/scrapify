import DodoPayments from "dodopayments";
import { getServerEnv } from "@/lib/server/env";

let cached: DodoPayments | null = null;

export class BillingNotConfiguredError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    this.name = "BillingNotConfiguredError";
    this.code = "BILLING_NOT_CONFIGURED";
  }
}

export function getDodoClient(): DodoPayments {
  if (cached) return cached;

  const env = getServerEnv();
  const apiKey = env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new BillingNotConfiguredError(
      "Billing is not configured. Missing DODO_PAYMENTS_API_KEY."
    );
  }

  const rawEnv = env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode";
  const environment =
    rawEnv === "test"
      ? "test_mode"
      : rawEnv === "live"
        ? "live_mode"
        : rawEnv;

  cached = new DodoPayments({
    bearerToken: apiKey,
    environment,
  });
  return cached;
}

export function isBillingConfigured(): boolean {
  try {
    const env = getServerEnv();
    return Boolean(env.DODO_PAYMENTS_API_KEY);
  } catch {
    return false;
  }
}
