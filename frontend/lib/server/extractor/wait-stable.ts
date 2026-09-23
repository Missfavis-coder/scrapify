import { createHash } from "node:crypto";
import type { Page } from "playwright-core";
import type {
  VisualStabilityOptions,
  VisualStabilityResult,
  DomQuietOptions,
  DomQuietResult,
  HeroReadyOptions,
  HeroReadyResult,
} from "@/lib/types/extraction";

export async function waitForHeroReady(
  page: Page,
  options: HeroReadyOptions
): Promise<HeroReadyResult> {
  return page.evaluate<HeroReadyResult, HeroReadyOptions>(
    ({ maxWaitMs, pollMs, loaderSelectors }) =>
      new Promise<HeroReadyResult>((resolve) => {
        const start = Date.now();

        const isVisible = (el: Element): boolean => {
          const style = window.getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") return false;
          if (Number(style.opacity) === 0) return false;
          const rect = el.getBoundingClientRect();
          return rect.width > 4 && rect.height > 4;
        };

        const blockingLoaderPresent = (): boolean => {
          const viewportArea = window.innerWidth * window.innerHeight;
          if (viewportArea === 0) return false;
          for (const selector of loaderSelectors) {
            for (const el of Array.from(document.querySelectorAll(selector))) {
              if (!isVisible(el)) continue;
              const style = window.getComputedStyle(el);
              const isOverlay =
                style.position === "fixed" ||
                style.position === "absolute" ||
                style.position === "sticky";
              if (!isOverlay) continue;
              const rect = el.getBoundingClientRect();
              if (rect.width * rect.height >= viewportArea * 0.3) return true;
            }
          }
          return false;
        };

        const viewportImagesLoaded = (): boolean => {
          const viewportHeight = window.innerHeight;
          for (const img of Array.from(document.images)) {
            const rect = img.getBoundingClientRect();
            if (rect.bottom <= 0 || rect.top >= viewportHeight) continue;
            if (rect.width < 4 || rect.height < 4) continue;
            if (!img.complete || img.naturalWidth === 0) return false;
          }
          return true;
        };

        const check = () => {
          const ready =
            document.readyState === "complete" &&
            !blockingLoaderPresent() &&
            viewportImagesLoaded();
          if (ready || Date.now() - start >= maxWaitMs) {
            resolve({ ready, elapsedMs: Date.now() - start });
            return;
          }
          window.setTimeout(check, pollMs);
        };

        check();
      }),
    options
  );
}

export async function waitForVisualStability(
  page: Page,
  options: VisualStabilityOptions
): Promise<VisualStabilityResult> {
  const start = Date.now();
  await page.waitForTimeout(options.minWaitMs);

  let previousHash = "";
  let consecutiveMatches = 0;
  let samples = 0;

  while (Date.now() - start < options.maxWaitMs) {
    const buffer = await page
      .screenshot({
        type: "jpeg",
        quality: options.sampleQuality,
        fullPage: false,
        animations: "allow",
      })
      .catch(() => null);

    if (!buffer) break;
    samples += 1;

    const hash = createHash("sha1").update(buffer).digest("hex");
    if (hash === previousHash) {
      consecutiveMatches += 1;
      if (consecutiveMatches >= options.stableFrames) {
        return { stable: true, elapsedMs: Date.now() - start, samples };
      }
    } else {
      consecutiveMatches = 0;
    }
    previousHash = hash;

    if (Date.now() - start + options.intervalMs >= options.maxWaitMs) break;
    await page.waitForTimeout(options.intervalMs);
  }

  return { stable: false, elapsedMs: Date.now() - start, samples };
}

export async function waitForDomQuiet(
  page: Page,
  options: DomQuietOptions
): Promise<DomQuietResult> {
  return page.evaluate<DomQuietResult, DomQuietOptions>(
    ({ quietMs, maxWaitMs }) =>
      new Promise<DomQuietResult>((resolve) => {
        const start = Date.now();
        let quietTimer = 0;
        let hardTimer = 0;

        const finish = (quiet: boolean) => {
          observer.disconnect();
          clearTimeout(quietTimer);
          clearTimeout(hardTimer);
          resolve({ quiet, elapsedMs: Date.now() - start });
        };

        const arm = () => {
          clearTimeout(quietTimer);
          quietTimer = window.setTimeout(() => finish(true), quietMs);
        };

        const observer = new MutationObserver(() => arm());
        observer.observe(document.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
        });

        hardTimer = window.setTimeout(() => finish(false), maxWaitMs);
        arm();
      }),
    options
  );
}
