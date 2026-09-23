import type { Page } from "playwright-core";
import { withContext } from "@/lib/server/extractor/browser";
import {
  autoScrollPage,
  deepAutoScrollPage,
  scrollToTop,
} from "@/lib/server/extractor/auto-scroll";
import {
  waitForVisualStability,
  waitForDomQuiet,
  waitForHeroReady,
} from "@/lib/server/extractor/wait-stable";
import { attachNetworkRecorder } from "@/lib/server/extractor/network-capture";
import { EXTRACT_TOKENS_SCRIPT } from "@/lib/server/extractor/inject/extract-tokens";
import { EXTRACT_CONTENT_SCRIPT } from "@/lib/server/extractor/inject/extract-content";
import { EXTRACT_MEDIA_SCRIPT } from "@/lib/server/extractor/inject/extract-media";
import { EXTRACT_LINK_CANDIDATES_SCRIPT } from "@/lib/server/extractor/inject/extract-link-candidates";
import {
  isCloudflareChallengeHtml,
  waitForChallengeToClear,
} from "@/lib/server/extractor/stealth";
import {
  detectProtectionWall,
  ProtectionWallError,
} from "@/lib/server/extractor/protection";
import { LIMITS, HERO_LOADER_SELECTORS } from "@/lib/constants/limits";
import { withTimeout } from "@/lib/utils/timeout";
import { logEvent, startTimer } from "@/lib/server/logger";
import type {
  CssTokens,
  ContentTokens,
  ExtractionResult,
  RootLinkCandidate,
  MediaAsset,
  MotionSignals,
  NetworkAsset,
  StackSignals,
} from "@/lib/types/extraction";

interface ExtractOptions {
  deep?: boolean;
}

interface RawMotionExtract {
  media: MediaAsset[];
  stack: StackSignals;
  docScrollHeight: number;
}

export async function extractFromUrl(
  url: string,
  options: ExtractOptions = {}
): Promise<ExtractionResult> {
  const deep = options.deep ?? false;
  return withContext(async (context) => {
    const browserReady = startTimer();
    const page = await context.newPage();
    logEvent("extract.context.ready", { url, deep, ms: browserReady() });

    const networkAssets = deep
      ? attachNetworkRecorder(page, LIMITS.motionMaxNetworkAssets)
      : null;

    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (deep) {
        if (type === "media") return route.abort();
        return route.continue();
      }
      if (type === "media" || type === "font") return route.abort();
      return route.continue();
    });

    const gotoElapsed = startTimer();
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: LIMITS.extractionTimeoutMs,
    });
    logEvent("extract.goto.done", { url, ms: gotoElapsed() });

    const initialHtml = await page.content().catch(() => "");
    if (isCloudflareChallengeHtml(initialHtml)) {
      const cfElapsed = startTimer();
      const cleared = await waitForChallengeToClear(page, {
        timeoutMs: LIMITS.cloudflareWaitMs,
      });
      logEvent("extract.cloudflare.wait", { url, ms: cfElapsed(), cleared });
      if (!cleared) {
        const blockedUrl = page.url();
        const detection = detectProtectionWall({
          finalUrl: blockedUrl,
          title: await page.title().catch(() => ""),
          html: await page.content().catch(() => ""),
        });
        if (detection) {
          logEvent("extract.protection.detected", {
            url,
            finalUrl: blockedUrl,
            kind: detection.kind,
            phase: "challenge-wait",
          });
          throw new ProtectionWallError(detection, blockedUrl);
        }
      }
    }

    const settleElapsed = startTimer();
    await Promise.all([
      page
        .waitForLoadState("load", { timeout: LIMITS.pageSettleLoadMs })
        .catch(() => undefined),
      page
        .evaluate(
          () => (document.fonts && document.fonts.ready) || Promise.resolve(null)
        )
        .catch(() => undefined),
    ]);
    await page
      .waitForLoadState("networkidle", {
        timeout: LIMITS.pageSettleNetworkIdleMs,
      })
      .catch(() => undefined);

    if (deep) {
      const quiet = await waitForDomQuiet(page, {
        quietMs: LIMITS.motionDomQuietMs,
        maxWaitMs: LIMITS.motionDomQuietMaxWaitMs,
      }).catch(() => ({ quiet: false, elapsedMs: 0 }));
      logEvent("extract.settle.done", {
        url,
        deep,
        ms: settleElapsed(),
        domQuiet: quiet.quiet,
        domQuietMs: quiet.elapsedMs,
      });
    } else {
      const stability = await waitForVisualStability(page, {
        minWaitMs: LIMITS.pageStabilityMinWaitMs,
        intervalMs: LIMITS.pageStabilityIntervalMs,
        maxWaitMs: LIMITS.pageStabilityMaxWaitMs,
        stableFrames: LIMITS.pageStabilityFrames,
        sampleQuality: LIMITS.pageStabilitySampleQuality,
      }).catch(() => ({ stable: false, elapsedMs: 0, samples: 0 }));
      logEvent("extract.settle.done", {
        url,
        deep,
        ms: settleElapsed(),
        stable: stability.stable,
        stabilityMs: stability.elapsedMs,
        stabilitySamples: stability.samples,
      });
    }

    const finalUrl = page.url();
    const host = new URL(finalUrl).hostname.replace(/^www\./, "");

    const protectionHtml = await page.content().catch(() => "");
    const protectionTitle = await page.title().catch(() => "");
    const detection = detectProtectionWall({
      finalUrl,
      title: protectionTitle,
      html: protectionHtml,
    });
    if (detection) {
      logEvent("extract.protection.detected", {
        url,
        finalUrl,
        kind: detection.kind,
      });
      throw new ProtectionWallError(detection, finalUrl);
    }

    if (deep) {
      return collectDeep(page, { url, finalUrl, host, networkAssets });
    }
    return collectShallow(page, { url, finalUrl, host });
  });
}

interface CollectContext {
  url: string;
  finalUrl: string;
  host: string;
}

async function collectShallow(
  page: Page,
  ctx: CollectContext
): Promise<ExtractionResult> {
  const parallelElapsed = startTimer();
  const [pageTitle, cssTokens, contentTokens, linkCandidates] =
    await Promise.all([
      page.title(),
      page.evaluate(EXTRACT_TOKENS_SCRIPT) as Promise<CssTokens>,
      page.evaluate(EXTRACT_CONTENT_SCRIPT) as Promise<ContentTokens>,
      page.evaluate(EXTRACT_LINK_CANDIDATES_SCRIPT) as Promise<RootLinkCandidate[]>,
    ]);
  logEvent("extract.parallel.done", {
    url: ctx.url,
    ms: parallelElapsed(),
    links: linkCandidates.length,
  });

  await withTimeout(
    autoScrollPage(page).catch(() => undefined),
    LIMITS.autoScrollWallMs,
    "auto-scroll"
  ).catch(() => undefined);

  const hero = await waitForHeroReady(page, {
    maxWaitMs: LIMITS.heroReadyMaxWaitMs,
    pollMs: LIMITS.heroReadyPollMs,
    loaderSelectors: [...HERO_LOADER_SELECTORS],
  }).catch(() => ({ ready: false, elapsedMs: 0 }));
  logEvent("extract.hero.ready", {
    url: ctx.url,
    ready: hero.ready,
    ms: hero.elapsedMs,
  });

  const fullElapsed = startTimer();
  const fullShot = await captureFullScreenshot(page);
  await scrollToTop(page);
  const screenshotAboveBuffer = await captureAboveFold(page);
  const screenshotFullBuffer = fullShot ?? screenshotAboveBuffer;
  logEvent("extract.screenshot.full.done", {
    url: ctx.url,
    ms: fullElapsed(),
    aboveBytes: screenshotAboveBuffer.length,
    bytes: screenshotFullBuffer.length,
  });

  return {
    url: ctx.url,
    finalUrl: ctx.finalUrl,
    host: ctx.host,
    pageTitle,
    screenshotAboveBuffer,
    screenshotFullBuffer,
    cssTokens,
    contentTokens,
    linkCandidates,
  };
}

async function collectDeep(
  page: Page,
  ctx: CollectContext & { networkAssets: NetworkAsset[] | null }
): Promise<ExtractionResult> {
  const scrollElapsed = startTimer();
  await withTimeout(
    deepAutoScrollPage(page).catch(() => undefined),
    LIMITS.deepScrollWallMs,
    "deep auto-scroll"
  ).catch(() => undefined);
  logEvent("extract.deep.scroll.done", { url: ctx.url, ms: scrollElapsed() });

  const hero = await waitForHeroReady(page, {
    maxWaitMs: LIMITS.heroReadyMaxWaitMs,
    pollMs: LIMITS.heroReadyPollMs,
    loaderSelectors: [...HERO_LOADER_SELECTORS],
  }).catch(() => ({ ready: false, elapsedMs: 0 }));
  logEvent("extract.hero.ready", {
    url: ctx.url,
    ready: hero.ready,
    ms: hero.elapsedMs,
  });

  const parallelElapsed = startTimer();
  const [pageTitle, cssTokens, baseContent, linkCandidates, motionRaw] =
    await Promise.all([
      page.title(),
      page.evaluate(EXTRACT_TOKENS_SCRIPT) as Promise<CssTokens>,
      page.evaluate(EXTRACT_CONTENT_SCRIPT) as Promise<ContentTokens>,
      page.evaluate(EXTRACT_LINK_CANDIDATES_SCRIPT) as Promise<RootLinkCandidate[]>,
      page.evaluate(EXTRACT_MEDIA_SCRIPT) as Promise<RawMotionExtract>,
    ]);

  const motion = buildMotionSignals(motionRaw, ctx.networkAssets);
  const contentTokens: ContentTokens = { ...baseContent, motion };
  logEvent("extract.deep.parallel.done", {
    url: ctx.url,
    ms: parallelElapsed(),
    mediaAssets: motion.media.length,
    networkAssets: motion.networkAssets.length,
    libraries: motion.stack.libraries.length,
    webgl: motion.stack.webgl,
  });

  const fullElapsed = startTimer();
  const fullShot = await captureFullScreenshot(page);
  await scrollToTop(page);
  const screenshotAboveBuffer = await captureAboveFold(page);
  const screenshotFullBuffer = fullShot ?? screenshotAboveBuffer;
  logEvent("extract.screenshot.full.done", {
    url: ctx.url,
    ms: fullElapsed(),
    aboveBytes: screenshotAboveBuffer.length,
    bytes: screenshotFullBuffer.length,
  });

  return {
    url: ctx.url,
    finalUrl: ctx.finalUrl,
    host: ctx.host,
    pageTitle,
    screenshotAboveBuffer,
    screenshotFullBuffer,
    cssTokens,
    contentTokens,
    linkCandidates,
  };
}

function buildMotionSignals(
  raw: RawMotionExtract,
  networkAssets: NetworkAsset[] | null
): MotionSignals {
  return {
    stack: raw.stack,
    media: raw.media.slice(0, LIMITS.motionMaxMediaAssets),
    networkAssets: (networkAssets ?? []).slice(0, LIMITS.motionMaxNetworkAssets),
    docScrollHeight: raw.docScrollHeight,
  };
}

async function captureFullScreenshot(page: Page): Promise<Buffer | null> {
  const shot = page
    .screenshot({
      type: "png",
      fullPage: true,
      animations: "disabled",
      timeout: LIMITS.screenshotFullMs,
    })
    .catch(() => null);
  const result = await withTimeout(
    shot,
    LIMITS.screenshotFullMs + 2_000,
    "full screenshot"
  ).catch(() => null);
  return result ? Buffer.from(result) : null;
}

async function captureAboveFold(page: Page): Promise<Buffer> {
  const shot = await page.screenshot({
    type: "png",
    fullPage: false,
    animations: "disabled",
  });
  return Buffer.from(shot);
}
