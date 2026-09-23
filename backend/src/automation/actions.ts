import { Page } from "playwright";
import { logger } from "../utils/logger.js";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}

/**
 * Navigates the page to a URL and waits for network idle / domcontentloaded.
 */
export async function navigateAction(page: Page, url: string): Promise<ActionResult> {
  const start = Date.now();
  try {
    logger.info("Action: navigate", { url });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return { success: true, durationMs: Date.now() - start };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Navigate failed", { url, error: errorMsg });
    return { success: false, error: errorMsg, durationMs: Date.now() - start };
  }
}

/**
 * Types text into an element identified by selector.
 */
export async function typeAction(
  page: Page,
  selector: string,
  text: string,
  pressEnter: boolean = true
): Promise<ActionResult> {
  const start = Date.now();
  try {
    logger.info("Action: type", { selector, text });
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.fill(selector, text);
    if (pressEnter) {
      await page.press(selector, "Enter");
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    }
    return { success: true, durationMs: Date.now() - start };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Type failed", { selector, error: errorMsg });
    return { success: false, error: errorMsg, durationMs: Date.now() - start };
  }
}

/**
 * Clicks an element.
 */
export async function clickAction(page: Page, selector: string): Promise<ActionResult> {
  const start = Date.now();
  try {
    logger.info("Action: click", { selector });
    await page.waitForSelector(selector, { timeout: 10000 });
    await page.click(selector);
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    return { success: true, durationMs: Date.now() - start };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Click failed", { selector, error: errorMsg });
    return { success: false, error: errorMsg, durationMs: Date.now() - start };
  }
}

/**
 * Waits for a specific amount of time or a selector.
 */
export async function waitAction(page: Page, durationMs: number = 1000): Promise<ActionResult> {
  const start = Date.now();
  await page.waitForTimeout(durationMs);
  return { success: true, durationMs: Date.now() - start };
}

/**
 * Extracts structured data from repeated card/item elements on the page.
 */
export async function extractAction(
  page: Page,
  containerSelector: string,
  fields: string[] = ["title", "price", "link"]
): Promise<ActionResult<Record<string, string | null>[]>> {
  const start = Date.now();
  try {
    logger.info("Action: extract", { containerSelector, fields });
    await page.waitForSelector(containerSelector, { timeout: 10000 });

    const results = await page.$$eval(
      containerSelector,
      (elements, extractedFields) => {
        return elements.slice(0, 50).map((el) => {
          const item: Record<string, string | null> = {};

          for (const field of extractedFields) {
            const fieldLower = field.toLowerCase();
            if (fieldLower.includes("price")) {
              // Try common price selectors or regex
              const priceEl =
                el.querySelector(".price, .price_color, [class*='price' i], [data-price]") ||
                el;
              const match = (priceEl.textContent || "").match(/[\$£€¥]?\s*\d+([.,]\d+)?/);
              item[field] = match ? match[0].trim() : (priceEl.textContent?.trim() || null);
            } else if (fieldLower.includes("title") || fieldLower.includes("name")) {
              // Try headings, title attributes or links
              const titleEl =
                el.querySelector("h3 a, h2 a, h1 a, h3, h2, [class*='title' i], [class*='name' i]") ||
                el.querySelector("a");
              item[field] =
                titleEl?.getAttribute("title") ||
                titleEl?.textContent?.trim() ||
                null;
            } else if (fieldLower.includes("link") || fieldLower.includes("url")) {
              const linkEl = el.querySelector("a") || (el.tagName === "A" ? el : null);
              item[field] = linkEl ? (linkEl as HTMLAnchorElement).href : null;
            } else if (fieldLower.includes("rating") || fieldLower.includes("star")) {
              const starEl = el.querySelector("[class*='star' i], [class*='rating' i], [aria-label*='star' i]");
              item[field] = starEl ? starEl.className || starEl.getAttribute("aria-label") : null;
            } else if (fieldLower.includes("availability") || fieldLower.includes("stock")) {
              const stockEl = el.querySelector(".availability, [class*='stock' i], [class*='avail' i]");
              item[field] = stockEl ? stockEl.textContent?.trim() || null : null;
            } else {
              // Generic fallback: check element with class matching field name
              const genericEl = el.querySelector(`.${field}, [class*='${field}' i]`);
              item[field] = genericEl ? genericEl.textContent?.trim() || null : null;
            }
          }

          return item;
        });
      },
      fields
    );

    return {
      success: true,
      data: results,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Extract failed", { containerSelector, error: errorMsg });
    return { success: false, error: errorMsg, durationMs: Date.now() - start };
  }
}
