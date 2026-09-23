import { LIMITS } from "@/lib/constants/limits";
import { logEvent, logError } from "@/lib/server/logger";
import { canonicalize, safeUrl } from "@/lib/server/extractor/scoring";
import { REAL_USER_AGENT } from "@/lib/server/extractor/stealth";

const SITEMAP_PATHS = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml"];
const MAX_INDEX_FOLLOWS = 4;
const MAX_URLS_RETURNED = 200;

export async function discoverSitemapUrls(rootUrl: string): Promise<string[]> {
  const root = safeUrl(rootUrl);
  if (!root) return [];

  const urls = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [];

  const robotsUrls = await readRobotsSitemaps(root.origin);
  for (const url of robotsUrls) queue.push(url);
  for (const path of SITEMAP_PATHS) queue.push(`${root.origin}${path}`);

  let indexFollows = 0;
  while (queue.length > 0 && urls.size < MAX_URLS_RETURNED) {
    const current = queue.shift();
    if (!current) break;
    if (visited.has(current)) continue;
    visited.add(current);

    const xml = await fetchText(current, LIMITS.crawlSitemapTimeoutMs);
    if (!xml) continue;

    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    if (isIndex) {
      if (indexFollows >= MAX_INDEX_FOLLOWS) continue;
      indexFollows += 1;
      for (const loc of extractLocs(xml)) queue.push(loc);
      continue;
    }

    for (const loc of extractLocs(xml)) {
      const c = canonicalize(loc);
      urls.add(c);
      if (urls.size >= MAX_URLS_RETURNED) break;
    }
  }

  const list = Array.from(urls);
  logEvent("sitemap.discover.done", { rootUrl, found: list.length });
  return list;
}

async function readRobotsSitemaps(origin: string): Promise<string[]> {
  const robots = await fetchText(`${origin}/robots.txt`, LIMITS.crawlSitemapTimeoutMs);
  if (!robots) return [];
  const out: string[] = [];
  for (const line of robots.split(/\r?\n/)) {
    const match = line.match(/^\s*sitemap\s*:\s*(\S+)/i);
    if (match) out.push(match[1].trim());
  }
  return out;
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const url = decodeXml(m[1].trim());
    if (url) out.push(url);
  }
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": REAL_USER_AGENT,
        Accept: "text/xml,application/xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (error) {
    logError("sitemap.fetch.failed", error, { url });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
