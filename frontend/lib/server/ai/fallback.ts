import { streamText, generateObject, type ModelMessage, type Schema } from "ai";
import { z } from "zod";
import { logEvent, logError } from "@/lib/server/logger";

type StreamOptions = Parameters<typeof streamText>[0];
type ModelHandle = StreamOptions["model"];

interface StreamCallOptions {
  system: string;
  messages: ModelMessage[];
  abortSignal?: AbortSignal;
}

export interface ModelEntry {
  id: string;
  model: ModelHandle;
}

export interface ModelChain {
  entries: ModelEntry[];
}

const ATTEMPTS_PER_MODEL = 3;
const RETRY_BACKOFF_MS: readonly number[] = [2000, 8000];
const TRANSIENT_BACKOFF_MS: readonly number[] = [400, 1200];
const MAX_RETRY_DELAY_MS = 20_000;
const RETRY_JITTER_RATIO = 0.2;
const SDK_INTERNAL_RETRIES = 0;

type ErrorKind = "rate-limit" | "transient" | "fatal";

function statusOf(error: unknown): number | undefined {
  return (
    (error as { status?: number; statusCode?: number }).status ??
    (error as { statusCode?: number }).statusCode
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRateLimit(error: unknown): boolean {
  if (!error) return false;
  const message = messageOf(error);
  if (/429|rate[\s_-]?limit|too\s*many|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return true;
  }
  return statusOf(error) === 429;
}

function isAuthOrConfig(error: unknown): boolean {
  const status = statusOf(error);
  if (status === 401 || status === 403) return true;
  return /api[\s_-]?key|unauthorized|permission[\s_-]?denied|forbidden/i.test(
    messageOf(error)
  );
}

function isNoObjectGenerated(error: unknown): boolean {
  const name = (error as { name?: string }).name ?? "";
  if (name === "AI_NoObjectGeneratedError") return true;
  return /no object generated|did not match schema|type validation failed/i.test(
    messageOf(error)
  );
}

function classifyError(error: unknown, callerSignal?: AbortSignal): ErrorKind {
  if (callerSignal?.aborted) return "fatal";
  if (isRateLimit(error)) return "rate-limit";
  if (isAuthOrConfig(error)) return "fatal";
  return "transient";
}

function getSuggestedRetryDelayMs(error: unknown): number | null {
  const candidates: string[] = [];
  if (error instanceof Error) candidates.push(error.message);

  const carrier = error as {
    responseBody?: unknown;
    responseHeaders?: Record<string, string>;
  };
  if (typeof carrier.responseBody === "string") {
    candidates.push(carrier.responseBody);
  }

  const header = carrier.responseHeaders?.["retry-after"];
  if (header) {
    const seconds = Number.parseFloat(header);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.round(seconds * 1000);
    }
  }

  for (const text of candidates) {
    const match = text.match(
      /retry(?:Delay|[-\s]?after)["':\s]*"?(\d+(?:\.\d+)?)s/i
    );
    if (match) {
      const seconds = Number.parseFloat(match[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.round(seconds * 1000);
      }
    }
  }
  return null;
}

function nextRetryDelayMs(
  attempt: number,
  error: unknown,
  kind: ErrorKind
): number {
  const schedule =
    kind === "rate-limit" ? RETRY_BACKOFF_MS : TRANSIENT_BACKOFF_MS;
  const base = schedule[attempt] ?? schedule[schedule.length - 1];
  const suggested =
    kind === "rate-limit" ? getSuggestedRetryDelayMs(error) ?? 0 : 0;
  const chosen = Math.min(Math.max(base, suggested), MAX_RETRY_DELAY_MS);
  const jitter = chosen * RETRY_JITTER_RATIO * Math.random();
  return Math.round(chosen + jitter);
}

function waitBeforeRetry(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve(true);
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      resolve(false);
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function chainIds(chain: ModelChain): string {
  return chain.entries.map((entry) => entry.id).join(" → ");
}

export interface StreamWithChainResult {
  textStream: AsyncIterable<string>;
  modelUsed: string;
}

export async function streamTextWithChain(
  chain: ModelChain,
  opts: StreamCallOptions
): Promise<StreamWithChainResult> {
  let previousId: string | null = null;
  for (const entry of chain.entries) {
    if (previousId) {
      logEvent("ai.fallback.activated", {
        from: previousId,
        to: entry.id,
        kind: "stream",
      });
    }
    previousId = entry.id;
    const stream = await tryStream(entry, opts);
    if (stream) return { textStream: stream, modelUsed: entry.id };
  }
  throw new Error(`All models rate-limited: ${chainIds(chain)}`);
}

async function tryStream(
  entry: ModelEntry,
  opts: StreamCallOptions
): Promise<AsyncIterable<string> | null> {
  for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
    try {
      const result = streamText({
        model: entry.model,
        system: opts.system,
        messages: opts.messages,
        abortSignal: opts.abortSignal,
        maxRetries: SDK_INTERNAL_RETRIES,
      });
      const iterator = result.textStream[Symbol.asyncIterator]();
      const first = await iterator.next();
      if (first.done || typeof first.value !== "string" || first.value.length === 0) {
        logEvent("ai.empty-stream", { model: entry.id, attempt });
        return null;
      }
      return composeStream(first, iterator);
    } catch (error) {
      if (!isRateLimit(error)) {
        logError("ai.stream.error", error, { model: entry.id, attempt });
        throw error;
      }
      if (attempt < ATTEMPTS_PER_MODEL - 1) {
        const delayMs = nextRetryDelayMs(attempt, error, "rate-limit");
        logEvent("ai.rate-limited", {
          model: entry.id,
          attempt,
          kind: "stream",
          delayMs,
        });
        const waited = await waitBeforeRetry(delayMs, opts.abortSignal);
        if (!waited) throw error;
      } else {
        logEvent("ai.rate-limited", {
          model: entry.id,
          attempt,
          kind: "stream",
          delayMs: 0,
        });
      }
    }
  }
  return null;
}

async function* composeStream(
  first: IteratorResult<string>,
  rest: AsyncIterator<string>
): AsyncGenerator<string, void, undefined> {
  if (!first.done && typeof first.value === "string") {
    yield first.value;
  }
  while (true) {
    const next = await rest.next();
    if (next.done) return;
    yield next.value;
  }
}

interface GenerateObjectOpts<T> {
  schema: z.ZodSchema<T> | Schema<T>;
  system?: string;
  prompt: string;
  abortSignal?: AbortSignal;
  timeoutMs?: number;
}

export interface ObjectWithChainResult<T> {
  value: T;
  modelUsed: string;
}

function attemptSignal(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number | undefined
): AbortSignal | undefined {
  if (!timeoutMs) return callerSignal;
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!callerSignal) return timeout;
  return AbortSignal.any([callerSignal, timeout]);
}

export async function generateObjectWithChainDetailed<T>(
  chain: ModelChain,
  opts: GenerateObjectOpts<T>
): Promise<ObjectWithChainResult<T>> {
  let previousId: string | null = null;
  let lastError: unknown = null;
  for (const entry of chain.entries) {
    if (previousId) {
      logEvent("ai.fallback.activated", {
        from: previousId,
        to: entry.id,
        kind: "object",
      });
    }
    previousId = entry.id;
    const attempt = await tryGenerate<T>(entry, opts);
    if (attempt.ok) return { value: attempt.value, modelUsed: entry.id };
    lastError = attempt.error;
    if (attempt.fatal) break;
  }
  throw (
    lastError ??
    new Error(`All models failed to generate object: ${chainIds(chain)}`)
  );
}

export async function generateObjectWithChain<T>(
  chain: ModelChain,
  opts: GenerateObjectOpts<T>
): Promise<T> {
  const result = await generateObjectWithChainDetailed(chain, opts);
  return result.value;
}

type TryGenerateResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown; fatal: boolean };

async function tryGenerate<T>(
  entry: ModelEntry,
  opts: GenerateObjectOpts<T>
): Promise<TryGenerateResult<T>> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
    try {
      const result = await generateObject({
        model: entry.model,
        schema: opts.schema,
        system: opts.system,
        prompt: opts.prompt,
        abortSignal: attemptSignal(opts.abortSignal, opts.timeoutMs),
        maxRetries: SDK_INTERNAL_RETRIES,
      });
      return { ok: true, value: result.object as T };
    } catch (error) {
      lastError = error;
      const kind = classifyError(error, opts.abortSignal);
      if (kind === "fatal") {
        logError("ai.object.error", error, {
          model: entry.id,
          attempt,
          fatal: true,
        });
        return { ok: false, error, fatal: true };
      }
      const isLastAttempt = attempt >= ATTEMPTS_PER_MODEL - 1;
      const delayMs = isLastAttempt ? 0 : nextRetryDelayMs(attempt, error, kind);
      logEvent("ai.object.retry", {
        model: entry.id,
        attempt,
        kind,
        delayMs,
        willFallthrough: isLastAttempt,
        error: messageOf(error).slice(0, 200),
      });
      if (isLastAttempt) break;
      const waited = await waitBeforeRetry(delayMs, opts.abortSignal);
      if (!waited) return { ok: false, error, fatal: true };
    }
  }
  return { ok: false, error: lastError, fatal: false };
}
