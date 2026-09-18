import { parse } from "node-html-parser";
import { INSPIRATION_HTTP } from "@/lib/constants/inspiration";
import { fetchOgImageWithBrowser } from "@/lib/server/inspiration/og-image-browser";
import { logError } from "@/lib/server/logger";

export interface OgImageResult {
  imageUrl: string;
  pageTitle: string | null;
  finalUrl: string;
}

export async function fetchOgImage(url: string): Promise<OgImageResult | null> {
  const fastResult = await fetchOgImageViaHttp(url);
  if (fastResult) return fastResult;

  try {
    return await fetchOgImageWithBrowser(url);
  } catch (error) {
    logError("inspiration.og.browser.failed", error, { url });
    return null;
  }
}

async function fetchOgImageViaHttp(
  url: string
): Promise<OgImageResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    INSPIRATION_HTTP.fetchTimeoutMs
  );
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": INSPIRATION_HTTP.userAgent,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!response.ok) return null;
    const finalUrl = response.url || url;
    const html = await response.text();
    if (html.trim().length === 0) return null;
    const root = parse(html);
    const imageUrl = pickOgImage(root);
    if (!imageUrl) return null;
    const absoluteImageUrl = resolveAbsoluteUrl(imageUrl, finalUrl);
    if (!absoluteImageUrl) return null;
    const pageTitle = pickPageTitle(root);
    return {
      imageUrl: absoluteImageUrl,
      pageTitle,
      finalUrl,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const IMAGE_META_PROPERTIES = [
  "og:image:secure_url",
  "og:image:url",
  "og:image",
  "twitter:image:src",
  "twitter:image",
] as const;

interface MetaParent {
  querySelectorAll(selector: string): MetaElement[];
}

interface MetaElement {
  getAttribute(name: string): string | undefined;
  text: string;
}

function pickOgImage(root: MetaParent): string | null {
  const metas = root.querySelectorAll("meta");
  for (const property of IMAGE_META_PROPERTIES) {
    for (const meta of metas) {
      const propAttr =
        meta.getAttribute("property") ?? meta.getAttribute("name");
      if (!propAttr) continue;
      if (propAttr.toLowerCase() !== property) continue;
      const content = meta.getAttribute("content");
      if (content && content.trim().length > 0) return content.trim();
    }
  }
  return null;
}

function pickPageTitle(root: MetaParent): string | null {
  const ogTitleMetas = root.querySelectorAll("meta");
  for (const meta of ogTitleMetas) {
    const propAttr = meta.getAttribute("property") ?? meta.getAttribute("name");
    if (propAttr?.toLowerCase() === "og:title") {
      const content = meta.getAttribute("content");
      if (content && content.trim().length > 0) return content.trim();
    }
  }
  const titles = root.querySelectorAll("title");
  if (titles.length > 0) {
    const text = titles[0].text.trim();
    if (text.length > 0) return text;
  }
  return null;
}

function resolveAbsoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
