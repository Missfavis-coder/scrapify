import { extractFromUrl } from "@/lib/server/extractor/extract";
import {
  isProtectionWallError,
  isRetriableProtectionKind,
} from "@/lib/server/extractor/protection";
import { withTimeout } from "@/lib/utils/timeout";
import { LIMITS } from "@/lib/constants/limits";
import { logEvent, startTimer } from "@/lib/server/logger";
import type { ExtractionResult } from "@/lib/types/extraction";

interface ExtractWithRetryInput {
  url: string;
  deep: boolean;
  attemptTimeoutMs: number;
  signal?: AbortSignal;
}

export async function extractWithRetry(
  input: ExtractWithRetryInput
): Promise<ExtractionResult> {
  const maxAttempts = LIMITS.extractionMaxAttempts;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    throwIfAborted(input.signal);
    const elapsed = startTimer();
    try {
      const result = await withTimeout(
        extractFromUrl(input.url, { deep: input.deep }),
        input.attemptTimeoutMs,
        "site extraction"
      );
      if (attempt > 1) {
        logEvent("extract.retry.recovered", {
          url: input.url,
          attempt,
          ms: elapsed(),
        });
      }
      return result;
    } catch (error) {
      lastError = error;
      const retriable =
        isProtectionWallError(error) && isRetriableProtectionKind(error.kind);
      if (!retriable || attempt >= maxAttempts) throw error;
      logEvent("extract.retry.blocked", {
        url: input.url,
        attempt,
        nextAttempt: attempt + 1,
        kind: error.kind,
        ms: elapsed(),
      });
      await delay(LIMITS.extractionRetryBackoffMs * attempt, input.signal);
    }
  }

  throw lastError;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Pipeline aborted");
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Pipeline aborted"));
      return;
    }
    const onAbort = () => {
      cleanup();
      reject(new Error("Pipeline aborted"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
