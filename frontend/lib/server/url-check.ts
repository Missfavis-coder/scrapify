const TIMEOUT_MS = 4500;
const USER_AGENT =
  "Mozilla/5.0 (compatible; getskillmd-bot/1.0; +https://getskillmd.com)";

const TOLERATED_STATUSES = new Set([401, 403, 406, 418, 429, 503]);

export type UrlCheckCode =
  | "OK"
  | "URL_NOT_FOUND"
  | "URL_SERVER_ERROR"
  | "URL_UNREACHABLE"
  | "URL_TIMEOUT"
  | "URL_BLOCKED";

export interface UrlCheckResult {
  ok: boolean;
  code: UrlCheckCode;
  status?: number;
  message: string;
}

export async function checkUrlReachable(href: string): Promise<UrlCheckResult> {
  const headResult = await tryFetch(href, "HEAD");

  if (headResult.kind === "error") {
    return classifyError(headResult.error);
  }

  if (headResult.status >= 400 && headResult.status !== 405 && headResult.status !== 501) {
    return classifyStatus(headResult.status);
  }

  if (headResult.status === 405 || headResult.status === 501) {
    const getResult = await tryFetch(href, "GET", { Range: "bytes=0-0" });
    if (getResult.kind === "error") return classifyError(getResult.error);
    return classifyStatus(getResult.status);
  }

  return { ok: true, code: "OK", status: headResult.status, message: "Reachable" };
}

type FetchOutcome =
  | { kind: "ok"; status: number }
  | { kind: "error"; error: unknown };

async function tryFetch(
  href: string,
  method: "HEAD" | "GET",
  extraHeaders: Record<string, string> = {}
): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(href, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "*/*",
        ...extraHeaders,
      },
    });
    return { kind: "ok", status: response.status };
  } catch (error) {
    return { kind: "error", error };
  } finally {
    clearTimeout(timer);
  }
}

function classifyStatus(status: number): UrlCheckResult {
  if (status >= 200 && status < 400) {
    return { ok: true, code: "OK", status, message: "Reachable" };
  }
  if (TOLERATED_STATUSES.has(status)) {
    return {
      ok: true,
      code: "URL_BLOCKED",
      status,
      message: `Site responded with ${status} but extraction may still work.`,
    };
  }
  if (status === 404 || status === 410) {
    return {
      ok: false,
      code: "URL_NOT_FOUND",
      status,
      message: "That page doesn't exist (404). Check the URL and try again.",
    };
  }
  return {
    ok: false,
    code: "URL_SERVER_ERROR",
    status,
    message: `Site returned an error (${status}). Try again later.`,
  };
}

function classifyError(error: unknown): UrlCheckResult {
  if (error instanceof Error && error.name === "AbortError") {
    return {
      ok: false,
      code: "URL_TIMEOUT",
      message: "Site took too long to respond. Try again or use a faster URL.",
    };
  }
  return {
    ok: false,
    code: "URL_UNREACHABLE",
    message: "Couldn't reach that site. Make sure the URL is correct and online.",
  };
}
