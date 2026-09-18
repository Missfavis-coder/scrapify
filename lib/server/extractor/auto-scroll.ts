import type { Page } from "playwright-core";
import { LIMITS } from "@/lib/constants/limits";
import type { DeepScrollOptions } from "@/lib/types/extraction";

interface AutoScrollOptions {
  stepRatio: number;
  delayMs: number;
  maxSteps: number;
  settleMs: number;
}

export async function autoScrollPage(page: Page): Promise<void> {
  const options: AutoScrollOptions = {
    stepRatio: LIMITS.pageScrollStepRatio,
    delayMs: LIMITS.pageScrollDelayMs,
    maxSteps: LIMITS.pageScrollMaxSteps,
    settleMs: LIMITS.pageScrollSettleMs,
  };

  await page.evaluate(async ({ stepRatio, delayMs, maxSteps }: AutoScrollOptions) => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = Math.max(1, Math.floor(window.innerHeight * stepRatio));
    let previousY = -1;

    for (let index = 0; index < maxSteps; index += 1) {
      window.scrollBy(0, step);
      await sleep(delayMs);
      const currentY = window.scrollY;
      const maxY = document.body.scrollHeight - window.innerHeight;
      if (currentY >= maxY || currentY === previousY) break;
      previousY = currentY;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, options);

  await page.waitForTimeout(options.settleMs);
}

export async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.scrollingElement ?? document.documentElement;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (root) {
      root.scrollTop = 0;
      root.scrollLeft = 0;
    }
  });
  await page.waitForTimeout(LIMITS.scrollToTopSettleMs);
}

export async function deepAutoScrollPage(page: Page): Promise<void> {
  const options: DeepScrollOptions = {
    stepRatio: LIMITS.motionScrollStepRatio,
    maxSteps: LIMITS.motionScrollMaxSteps,
    settleMs: LIMITS.motionScrollSettleMs,
    quietMs: LIMITS.motionScrollQuietMs,
    maxMs: LIMITS.motionScrollMaxMs,
  };

  await page.evaluate(async (opts: DeepScrollOptions) => {
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const raf = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.setAttribute("loading", "eager");
    });

    const docEl = document.documentElement;
    const maxScroll = () =>
      Math.max(document.body.scrollHeight, docEl.scrollHeight) - window.innerHeight;
    const step = Math.max(1, Math.floor(window.innerHeight * opts.stepRatio));
    const start = Date.now();
    let previousY = -1;

    window.dispatchEvent(new Event("resize"));

    for (let index = 0; index < opts.maxSteps; index += 1) {
      if (Date.now() - start > opts.maxMs) break;
      window.scrollBy(0, step);
      window.dispatchEvent(new Event("scroll"));
      await raf();
      await sleep(opts.settleMs);
      const currentY = window.scrollY || docEl.scrollTop;
      if (currentY >= maxScroll() - 2 || currentY === previousY) break;
      previousY = currentY;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    window.dispatchEvent(new Event("scroll"));
    await raf();
  }, options);

  await page.waitForTimeout(options.quietMs);
}
