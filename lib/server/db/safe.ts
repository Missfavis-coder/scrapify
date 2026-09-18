import { logError } from "@/lib/server/logger";

export async function safeDbCall<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError("safe-db", error, { label });
    return fallback;
  }
}
