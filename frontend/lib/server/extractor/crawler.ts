import type { BrowserContext } from "playwright-core";
import { withContext } from "@/lib/server/extractor/browser";
import { EXTRACT_CONTENT_SCRIPT } from "@/lib/server/extractor/inject/extract-content";
import { EXTRACT_LINKS_SCRIPT } from "@/lib/server/extractor/inject/extract-links";
import { fetchHtmlAndExtract } from "@/lib/server/extractor/fetch-first";
import { discoverSitemapUrls } from "@/lib/server/extractor/sitemap";
import {
  isCloudflareChallengeHtml,
  waitForChallengeToClear,
} from "@/lib/server/extractor/stealth";
import {
  scoreLinks,
  canonicalize,
  safeHost,
  safePathPrefix,
  type LinkCandidate,
  type ScoredLink,
} from "@/lib/server/extractor/scoring";
import { LIMITS } from "@/lib/constants/limits";
import { logEvent, logError, startTimer } from "@/lib/server/logger";
import type {
  ContentTokens,
  CrawlResult,
  ExtractedPage,
} from "@/lib/types/extraction";
import type { GenerationMode } from "@/lib/types/generation";

interface CrawlInput {
  rootUrl: string;
  mode: GenerationMode;
  maxPages?: number;
  rootContentTokens?: ContentTokens;
  rootLinks?: LinkCandidate[];
  rootPageTitle?: string;
}

export function shouldCrawlMode(mode: GenerationMode): boolean {
  return mode === "api" || mode === "library" || mode === "generic";
}

export async function crawl(input: CrawlInput): Promise<CrawlResult> {
  const maxPages = input.maxPages ?? LIMITS.crawlMaxPages;
  const rootCanonical = canonicalize(input.rootUrl);
  const rootHost = safeHost(input.rootUrl);
  const rootPathPrefix = safePathPrefix(input.rootUrl);
  const visited = new Set<string>([rootCanonical]);
  const pages: ExtractedPage[] = [];

  const rootPage = makeRootPage(input);
  if (rootPage) pages.push(rootPage);

  if (!rootHost) return finalize(pages);

  const rootCandidates: LinkCandidate[] = input.rootLinks ?? [];
  const sitemapUrls = await discoverSitemapUrls(input.rootUrl).catch(() => []);
  const sitemapCandidates: LinkCandidate[] = sitemapUrls.map((url, i) => ({
    url,
    anchorText: "",
    navDepth: -1,
    navIndex: i < 100 ? i : -1,
  }));

  const ranked: ScoredLink[] = scoreLinks({
    candidates: [...rootCandidates, ...sitemapCandidates],
    rootHost,
    rootPathPrefix,
    mode: input.mode,
  }).filter((s) => s.url !== rootCanonical);

  logEvent("crawler.discovery.done", {
    rootUrl: input.rootUrl,
    fromRoot: rootCandidates.length,
    fromSitemap: sitemapCandidates.length,
    scored: ranked.length,
    sitemapHit: sitemapUrls.length > 0,
  });

  const remainingSlots = Math.max(0, maxPages - pages.length);
  if (remainingSlots === 0 || ranked.length === 0) return finalize(pages);

  const targets = ranked.slice(0, Math.min(remainingSlots * 2, 40));
  const fetched = await fetchPagesInWaves({
    targets,
    visited,
    maxPages: remainingSlots,
  });

  for (const page of fetched) pages.push(page);

  return finalize(pages);
}

function finalize(pages: ExtractedPage[]): CrawlResult {
  const totalChars = pages.reduce(
    (sum, p) => sum + approxContentChars(p.contentTokens),
    0
  );
  logEvent("crawler.done", { pages: pages.length, totalChars });
  return {
    pages: pages.map(({ url, finalUrl, pageTitle, contentTokens, score }) => ({
      url,
      finalUrl,
      pageTitle,
      contentTokens,
      score,
    })),
    totalChars,
  };
}

function makeRootPage(input: CrawlInput): ExtractedPage | null {
  if (!input.rootContentTokens) return null;
  return {
    url: input.rootUrl,
    finalUrl: input.rootUrl,
    pageTitle: input.rootPageTitle ?? "",
    contentTokens: input.rootContentTokens,
    score: Number.MAX_SAFE_INTEGER,
  };
}

interface WaveInput {
  targets: ScoredLink[];
  visited: Set<string>;
  maxPages: number;
}

async function fetchPagesInWaves(input: WaveInput): Promise<ExtractedPage[]> {
  const out: ExtractedPage[] = [];
  let i = 0;

  while (i < input.targets.length && out.length < input.maxPages) {
    const batch: ScoredLink[] = [];
    while (
      batch.length < LIMITS.crawlConcurrency &&
      i < input.targets.length &&
      out.length + batch.length < input.maxPages
    ) {
      const next = input.targets[i];
      i += 1;
      const canonical = canonicalize(next.url);
      if (input.visited.has(canonical)) continue;
      input.visited.add(canonical);
      batch.push(next);
    }
    if (batch.length === 0) continue;

    const results = await Promise.all(batch.map((t) => fetchOnePage(t)));

    for (const r of results) {
      if (!r) continue;
      out.push(r);
      if (out.length >= input.maxPages) break;
    }
  }

  return out;
}

async function fetchOnePage(target: ScoredLink): Promise<ExtractedPage | null> {
  const elapsed = startTimer();

  const fetched = await fetchHtmlAndExtract({ url: target.url });
  if (fetched && fetched.contentChars >= LIMITS.crawlMinFetchContentChars) {
    logEvent("crawler.page.fetch", {
      url: target.url,
      ms: elapsed(),
      chars: fetched.contentChars,
      score: target.score,
    });
    return {
      url: target.url,
      finalUrl: fetched.finalUrl,
      pageTitle: fetched.pageTitle,
      contentTokens: fetched.contentTokens,
      score: target.score,
    };
  }

  const playwrightResult = await fetchViaPlaywrightOnce(target.url).catch((error) => {
    logError("crawler.page.playwright.failed", error, { url: target.url });
    return null;
  });
  if (playwrightResult) {
    logEvent("crawler.page.playwright", {
      url: target.url,
      ms: elapsed(),
      score: target.score,
      fellBackFrom: fetched ? "thin-content" : "fetch-failed",
    });
    return { ...playwrightResult, score: target.score };
  }

  if (fetched) {
    return {
      url: target.url,
      finalUrl: fetched.finalUrl,
      pageTitle: fetched.pageTitle,
      contentTokens: fetched.contentTokens,
      score: target.score,
    };
  }

  return null;
}

async function fetchViaPlaywrightOnce(url: string): Promise<ExtractedPage | null> {
  return withContext(async (context) => fetchViaPlaywright(context, url));
}

async function fetchViaPlaywright(
  context: BrowserContext,
  url: string
): Promise<ExtractedPage | null> {
  const page = await context.newPage();
  try {
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (type === "media" || type === "font" || type === "image") {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: LIMITS.crawlPageTimeoutMs,
    });

    const initialHtml = await page.content().catch(() => "");
    if (isCloudflareChallengeHtml(initialHtml)) {
      const cleared = await waitForChallengeToClear(page, {
        timeoutMs: LIMITS.cloudflareWaitMs,
      });
      logEvent("crawler.page.cloudflare.wait", { url, cleared });
      if (!cleared) {
        const stillHtml = await page.content().catch(() => "");
        if (isCloudflareChallengeHtml(stillHtml)) {
          logEvent("crawler.page.blocked", { url });
          return null;
        }
      }
    }

    const finalUrl = page.url();
    const [pageTitle, contentTokens] = await Promise.all([
      page.title(),
      page.evaluate(EXTRACT_CONTENT_SCRIPT) as Promise<ContentTokens>,
    ]);

    return {
      url,
      finalUrl,
      pageTitle,
      contentTokens,
    };
  } catch (error) {
    logError("crawler.page.failed", error, { url });
    return null;
  } finally {
    await page.close().catch(() => undefined);
  }
}

export async function fetchRootLinkCandidates(rootUrl: string): Promise<LinkCandidate[]> {
  const fetched = await fetchHtmlAndExtract({ url: rootUrl });
  return fetched?.linkCandidates ?? [];
}

export async function fetchRootLinkCandidatesViaPlaywright(
  rootUrl: string
): Promise<LinkCandidate[]> {
  return withContext(async (context) => {
    const page = await context.newPage();
    try {
      await page.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (type === "media" || type === "font" || type === "image") {
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(rootUrl, {
        waitUntil: "domcontentloaded",
        timeout: LIMITS.crawlPageTimeoutMs,
      });
      const links = (await page.evaluate(EXTRACT_LINKS_SCRIPT)) as string[];
      return links.map((url, i) => ({
        url,
        anchorText: "",
        navDepth: -1,
        navIndex: i < 100 ? i : -1,
      }));
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}

function approxContentChars(content: ContentTokens): number {
  let total = content.metaTitle.length + content.metaDescription.length;
  for (const h of content.headings) total += h.text.length;
  for (const p of content.paragraphs) total += p.length;
  for (const c of content.codeBlocks) total += c.snippet.length;
  return total;
}
