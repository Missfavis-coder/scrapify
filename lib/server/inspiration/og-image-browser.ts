import { withContext } from "@/lib/server/extractor/browser";
import { INSPIRATION_BROWSER_PREVIEW } from "@/lib/constants/inspiration";
import type { OgImageResult } from "@/lib/server/inspiration/og-image";

const IMAGE_META_PROPERTIES = [
  "og:image:secure_url",
  "og:image:url",
  "og:image",
  "twitter:image:src",
  "twitter:image",
] as const;

export async function fetchOgImageWithBrowser(
  url: string
): Promise<OgImageResult | null> {
  return withContext(async (context) => {
    const page = await context.newPage();
    try {
      await page.route("**/*", (route) => {
        const type = route.request().resourceType();
        if (
          type === "media" ||
          type === "font" ||
          type === "image" ||
          type === "stylesheet"
        ) {
          return route.abort();
        }
        return route.continue();
      });

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: INSPIRATION_BROWSER_PREVIEW.navigateTimeoutMs,
      });

      const imageUrl = await page
        .waitForFunction(
          (props: ReadonlyArray<string>) => {
            const metas = document.querySelectorAll("meta");
            for (const property of props) {
              for (const meta of Array.from(metas)) {
                const attr =
                  meta.getAttribute("property") ?? meta.getAttribute("name");
                if (!attr) continue;
                if (attr.toLowerCase() !== property) continue;
                const content = meta.getAttribute("content");
                if (content && content.trim().length > 0) {
                  return content.trim();
                }
              }
            }
            return null;
          },
          IMAGE_META_PROPERTIES as unknown as string[],
          { timeout: INSPIRATION_BROWSER_PREVIEW.metaWaitMs, polling: 400 }
        )
        .then((handle) => handle.jsonValue() as Promise<string | null>)
        .catch(() => null);

      if (!imageUrl) return null;

      const finalUrl = page.url();
      const absoluteImageUrl = resolveAbsolute(imageUrl, finalUrl);
      if (!absoluteImageUrl) return null;

      const pageTitle = await readPageTitle(page);

      return {
        imageUrl: absoluteImageUrl,
        pageTitle,
        finalUrl,
      };
    } finally {
      await page.close().catch(() => undefined);
    }
  });
}

interface TitleReader {
  evaluate<T>(fn: () => T): Promise<T>;
  title(): Promise<string>;
}

async function readPageTitle(page: TitleReader): Promise<string | null> {
  const ogTitle = await page
    .evaluate(() => {
      const metas = document.querySelectorAll("meta");
      for (const meta of Array.from(metas)) {
        const attr =
          meta.getAttribute("property") ?? meta.getAttribute("name");
        if (attr?.toLowerCase() === "og:title") {
          const content = meta.getAttribute("content");
          if (content && content.trim().length > 0) {
            return content.trim();
          }
        }
      }
      return null;
    })
    .catch(() => null);
  if (ogTitle) return ogTitle;

  const documentTitle = await page.title().catch(() => "");
  const trimmed = documentTitle.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveAbsolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}
