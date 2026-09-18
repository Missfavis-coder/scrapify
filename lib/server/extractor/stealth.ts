import type { Page } from "playwright-core";

export const REAL_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const REAL_VIEWPORT = { width: 1440, height: 900 };
export const REAL_LOCALE = "en-US";
export const REAL_TIMEZONE = "America/New_York";

export const REAL_BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": REAL_USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Ch-Ua":
    '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

export const STEALTH_LAUNCH_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--disable-features=IsolateOrigins,site-per-process",
];

export const STEALTH_INIT_SCRIPT = `
(() => {
  try {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  } catch {}
  try {
    if (!window.chrome) {
      Object.defineProperty(window, 'chrome', {
        get: () => ({ runtime: {}, app: {}, csi: () => {}, loadTimes: () => {} }),
      });
    }
  } catch {}
  try {
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer' },
        { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer' },
        { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer' },
        { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer' },
      ],
    });
  } catch {}
  try {
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  } catch {}
  try {
    const orig = window.navigator.permissions && window.navigator.permissions.query;
    if (orig) {
      window.navigator.permissions.query = (params) =>
        params && params.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : orig.call(window.navigator.permissions, params);
    }
  } catch {}
})();
`;

const CF_TITLE_HINTS = [
  "just a moment",
  "attention required",
  "checking your browser",
  "please wait...",
];

const CF_BODY_HINTS = [
  "cf-mitigated",
  "cf-browser-verification",
  "cf-chl-bypass",
  "cf-error-details",
  "cloudflare ray id",
  "ddos protection by cloudflare",
];

export function isCloudflareChallengeHtml(html: string): boolean {
  const lower = html.toLowerCase();
  if (CF_BODY_HINTS.some((h) => lower.includes(h))) return true;
  const titleMatch = lower.match(/<title[^>]*>([^<]*)<\/title>/);
  if (!titleMatch) return false;
  const title = titleMatch[1].trim();
  return CF_TITLE_HINTS.some((h) => title.includes(h));
}

interface WaitOpts {
  timeoutMs: number;
  pollMs?: number;
}

export async function waitForChallengeToClear(
  page: Page,
  opts: WaitOpts
): Promise<boolean> {
  const start = Date.now();
  const pollMs = opts.pollMs ?? 500;
  while (Date.now() - start < opts.timeoutMs) {
    const title = (await page.title().catch(() => "")) || "";
    const lower = title.toLowerCase();
    const stillChallenged = CF_TITLE_HINTS.some((h) => lower.includes(h));
    if (!stillChallenged) {
      const html = await page.content().catch(() => "");
      if (!isCloudflareChallengeHtml(html)) return true;
    }
    await page.waitForTimeout(pollMs);
  }
  return false;
}
