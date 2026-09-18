import { parse, type HTMLElement } from "node-html-parser";
import { LIMITS } from "@/lib/constants/limits";
import { logEvent, logError } from "@/lib/server/logger";
import {
  REAL_BROWSER_HEADERS,
  isCloudflareChallengeHtml,
} from "@/lib/server/extractor/stealth";
import type { ContentTokens } from "@/lib/types/extraction";
import type { LinkCandidate } from "@/lib/server/extractor/scoring";

export interface FetchedHtml {
  finalUrl: string;
  pageTitle: string;
  contentTokens: ContentTokens;
  linkCandidates: LinkCandidate[];
  contentChars: number;
}

interface FetchHtmlInput {
  url: string;
  timeoutMs?: number;
}

export async function fetchHtmlAndExtract(
  input: FetchHtmlInput
): Promise<FetchedHtml | null> {
  const html = await fetchRaw(input.url, input.timeoutMs ?? LIMITS.crawlFetchTimeoutMs);
  if (!html) return null;

  return parseHtml({ html: html.body, finalUrl: html.finalUrl });
}

interface ParseInput {
  html: string;
  finalUrl: string;
}

export function parseHtml(input: ParseInput): FetchedHtml {
  const root = parse(input.html, {
    blockTextElements: { script: false, style: false, noscript: false },
  });

  const baseHref =
    root.querySelector("base[href]")?.getAttribute("href") ?? input.finalUrl;
  const base = (() => {
    try {
      return new URL(baseHref, input.finalUrl);
    } catch {
      return new URL(input.finalUrl);
    }
  })();

  const pageTitle = (root.querySelector("title")?.textContent ?? "").trim();

  const metaDescription =
    attr(root.querySelector('meta[name="description"]'), "content") ??
    attr(root.querySelector('meta[property="og:description"]'), "content") ??
    "";

  const main = pickMain(root);

  const headings = extractHeadings(main);
  const paragraphs = extractParagraphs(main);
  const codeBlocks = extractCodeBlocks(main);

  const linkCandidates = extractLinks(root, base);

  const favicon =
    absolutize(
      attr(root.querySelector('link[rel="icon"][sizes]:not([sizes="any"])'), "href") ??
        attr(root.querySelector('link[rel="apple-touch-icon"]'), "href") ??
        attr(root.querySelector('link[rel~="icon"]'), "href") ??
        attr(root.querySelector('link[rel="shortcut icon"]'), "href") ??
        "/favicon.ico",
      base
    );

  const ogImage = absolutize(
    attr(root.querySelector('meta[property="og:image"]'), "content"),
    base
  );

  const twitterImage = absolutize(
    attr(root.querySelector('meta[name="twitter:image"]'), "content") ??
      attr(root.querySelector('meta[property="twitter:image"]'), "content"),
    base
  );

  const contentTokens: ContentTokens = {
    metaTitle: pageTitle,
    metaDescription,
    headings: headings.slice(0, 60),
    codeBlocks: codeBlocks.slice(0, 30),
    paragraphs: paragraphs.slice(0, 30),
    favicon,
    ogImage,
    twitterImage,
    logo: null,
    assets: [],
  };

  const contentChars =
    paragraphs.reduce((sum, p) => sum + p.length, 0) +
    codeBlocks.reduce((sum, c) => sum + c.snippet.length, 0) +
    headings.reduce((sum, h) => sum + h.text.length, 0);

  return {
    finalUrl: input.finalUrl,
    pageTitle,
    contentTokens,
    linkCandidates,
    contentChars,
  };
}

function attr(el: HTMLElement | null | undefined, name: string): string | null {
  if (!el) return null;
  return el.getAttribute(name) ?? null;
}

function pickMain(root: HTMLElement): HTMLElement {
  return (
    root.querySelector("main") ??
    root.querySelector("article") ??
    root.querySelector('[role="main"]') ??
    root.querySelector("#content") ??
    root.querySelector(".content") ??
    root.querySelector("body") ??
    root
  );
}

function extractHeadings(scope: HTMLElement): { level: number; text: string }[] {
  const out: { level: number; text: string }[] = [];
  for (const el of scope.querySelectorAll("h1, h2, h3, h4")) {
    const text = (el.textContent ?? "").trim();
    if (!text) continue;
    out.push({
      level: parseInt(el.tagName.slice(1), 10),
      text: text.slice(0, 200),
    });
  }
  return out;
}

function extractParagraphs(scope: HTMLElement): string[] {
  const out: string[] = [];
  for (const el of scope.querySelectorAll("p")) {
    const text = (el.textContent ?? "").trim().replace(/\s+/g, " ");
    if (text.length > 40) out.push(text.slice(0, 400));
  }
  return out;
}

function extractCodeBlocks(scope: HTMLElement): { language: string; snippet: string }[] {
  const out: { language: string; snippet: string }[] = [];
  for (const el of scope.querySelectorAll("pre code, pre")) {
    const snippet = (el.textContent ?? "").trim();
    if (!snippet) continue;
    const className =
      el.getAttribute?.("class") ?? el.classList?.toString() ?? "";
    const langMatch = className.match(/language-([\w-]+)/);
    out.push({
      language: langMatch?.[1] ?? "text",
      snippet: snippet.slice(0, 600),
    });
  }
  return out;
}

function extractLinks(root: HTMLElement, base: URL): LinkCandidate[] {
  const navs = Array.from(root.querySelectorAll("nav, aside, [role='navigation']"));
  const navIndexById = new Map<string, { navIndex: number; navDepth: number }>();

  for (const nav of navs) {
    const anchors = Array.from(nav.querySelectorAll("a[href]"));
    anchors.forEach((a, i) => {
      const href = a.getAttribute("href");
      if (!href) return;
      const abs = absolutize(href, base);
      if (!abs) return;
      const depth = ancestorDepthIn(a, nav);
      const existing = navIndexById.get(abs);
      if (!existing || existing.navIndex > i) {
        navIndexById.set(abs, { navIndex: i, navDepth: depth });
      }
    });
  }

  const candidates: LinkCandidate[] = [];
  const seen = new Set<string>();

  for (const a of root.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (!href) continue;
    const abs = absolutize(href, base);
    if (!abs) continue;
    if (seen.has(abs)) continue;
    seen.add(abs);
    const navInfo = navIndexById.get(abs);
    candidates.push({
      url: abs,
      anchorText: (a.textContent ?? "").trim().slice(0, 200),
      navDepth: navInfo?.navDepth ?? -1,
      navIndex: navInfo?.navIndex ?? -1,
    });
  }

  return candidates;
}

function ancestorDepthIn(node: HTMLElement, ancestor: HTMLElement): number {
  let depth = 0;
  let current: HTMLElement | null = node.parentNode as HTMLElement | null;
  while (current && current !== ancestor && depth < 10) {
    if ((current.tagName ?? "").toLowerCase() === "li") depth += 1;
    current = current.parentNode as HTMLElement | null;
  }
  return depth;
}

function absolutize(href: string | null | undefined, base: URL): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

interface FetchRawResult {
  body: string;
  finalUrl: string;
}

async function fetchRaw(url: string, timeoutMs: number): Promise<FetchRawResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: REAL_BROWSER_HEADERS,
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) {
      const cfRay = res.headers.get("cf-ray");
      if (cfRay) {
        logEvent("fetch-first.cloudflare-blocked", {
          url,
          status: res.status,
          cfRay,
        });
      }
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html") && !contentType.includes("xml")) return null;
    const body = await res.text();
    if (isCloudflareChallengeHtml(body)) {
      logEvent("fetch-first.cloudflare-challenge", { url });
      return null;
    }
    return { body, finalUrl: res.url || url };
  } catch (error) {
    logError("fetch-first.failed", error, { url });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
