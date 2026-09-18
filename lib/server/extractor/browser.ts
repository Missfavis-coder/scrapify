import { chromium, type Browser, type BrowserContext } from "playwright-core";
import {
  REAL_BROWSER_HEADERS,
  REAL_LOCALE,
  REAL_TIMEZONE,
  REAL_USER_AGENT,
  REAL_VIEWPORT,
  STEALTH_INIT_SCRIPT,
  STEALTH_LAUNCH_ARGS,
} from "@/lib/server/extractor/stealth";

let cachedBrowser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.isConnected()) return cachedBrowser;

  cachedBrowser = await chromium.launch({
    args: ["--no-sandbox", ...STEALTH_LAUNCH_ARGS],
    headless: true,
  });

  return cachedBrowser;
}

export async function withContext<T>(
  fn: (context: BrowserContext) => Promise<T>
): Promise<T> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: REAL_VIEWPORT,
    deviceScaleFactor: 1,
    userAgent: REAL_USER_AGENT,
    locale: REAL_LOCALE,
    timezoneId: REAL_TIMEZONE,
    extraHTTPHeaders: REAL_BROWSER_HEADERS,
  });
  await context.addInitScript(STEALTH_INIT_SCRIPT);
  try {
    return await fn(context);
  } finally {
    await context.close();
  }
}
