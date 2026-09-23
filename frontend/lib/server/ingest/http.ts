import { REQUEST_RETRIES, REQUEST_TIMEOUT_MS } from "@/lib/server/ingest/constants";

export interface FetchOptions {
  retries?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
  acceptStatus?: (status: number) => boolean;
}

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent": "getskillmd-ingest/1.0 (+https://getskillmd.com)",
};

export async function httpGet(url: string, options: FetchOptions = {}): Promise<Response> {
  const retries = options.retries ?? REQUEST_RETRIES;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const acceptStatus = options.acceptStatus ?? ((s) => s >= 200 && s < 300);

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { ...DEFAULT_HEADERS, ...(options.headers ?? {}) },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (acceptStatus(res.status)) return res;
      if (res.status === 404) return res;
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
        await sleep(backoffMs(attempt));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries) await sleep(backoffMs(attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`Failed to GET ${url}`);
}

export async function httpGetText(url: string, options: FetchOptions = {}): Promise<string> {
  const res = await httpGet(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function httpGetJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const res = await httpGet(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function backoffMs(attempt: number): number {
  return Math.min(2_000 * Math.pow(2, attempt), 15_000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
