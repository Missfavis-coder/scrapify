import { chromium, Browser, BrowserContext, Page } from "playwright";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

let browserInstance: Browser | null = null;

export interface BrowserOptions {
  blockMedia?: boolean;
}

/**
 * Gets or launches a singleton Playwright Chromium browser instance.
 */
export async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    const isDev = env.NODE_ENV === "development";
    logger.info("Launching Playwright Chromium", { headless: !isDev });

    browserInstance = await chromium.launch({
      headless: !isDev,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });
  }
  return browserInstance;
}

/**
 * Creates a fresh browser context and page, with optional resource blocking for speed & compute savings.
 */
export async function createPage(options: BrowserOptions = {}): Promise<{ context: BrowserContext; page: Page }> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  const page = await context.newPage();

  // Block images and media if requested to save memory and speed up scraping
  if (options.blockMedia) {
    await page.route("**/*", (route) => {
      const resourceType = route.request().resourceType();
      if (["image", "media", "font"].includes(resourceType)) {
        return route.abort();
      }
      return route.continue();
    });
  }

  return { context, page };
}

/**
 * Closes the browser instance if open.
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    logger.info("Closing Playwright browser");
    await browserInstance.close();
    browserInstance = null;
  }
}
