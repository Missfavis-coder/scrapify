export const EXTRACT_CONTENT_SCRIPT = `
(() => {
  const headings = [];
  const codeBlocks = [];
  const paragraphs = [];

  document.querySelectorAll("h1, h2, h3, h4").forEach((el) => {
    const text = el.textContent?.trim() ?? "";
    if (text) {
      headings.push({ level: parseInt(el.tagName.slice(1), 10), text: text.slice(0, 200) });
    }
  });

  document.querySelectorAll("pre code, pre").forEach((el) => {
    const snippet = el.textContent?.trim() ?? "";
    if (snippet) {
      const className = el.className || "";
      const langMatch = className.match(/language-([\\w-]+)/);
      codeBlocks.push({
        language: langMatch?.[1] ?? "text",
        snippet: snippet.slice(0, 600),
      });
    }
  });

  document.querySelectorAll("p").forEach((el) => {
    const text = el.textContent?.trim() ?? "";
    if (text.length > 40) paragraphs.push(text.slice(0, 400));
  });

  const metaTitle = document.title ?? "";
  const metaDescription =
    document.querySelector('meta[name="description"]')?.getAttribute("content") ??
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ??
    "";

  const absolutize = (url) => {
    if (!url) return null;
    try { return new URL(url, document.baseURI).href; } catch { return null; }
  };

  const faviconCandidates = [
    document.querySelector('link[rel="icon"][sizes]:not([sizes="any"])')?.getAttribute("href"),
    document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href"),
    document.querySelector('link[rel~="icon"]')?.getAttribute("href"),
    document.querySelector('link[rel="shortcut icon"]')?.getAttribute("href"),
    "/favicon.ico",
  ];
  const favicon = faviconCandidates
    .map((href) => absolutize(href ?? null))
    .find((href) => href !== null) ?? null;

  const ogImage = absolutize(document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null);
  const twitterImage = absolutize(
    document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ??
      document.querySelector('meta[property="twitter:image"]')?.getAttribute("content") ?? null
  );

  let logo = null;
  const logoSelectors = ['header img', 'nav img', '[class*="logo" i] img', 'img[class*="logo" i]', 'img[alt*="logo" i]'];
  for (const sel of logoSelectors) {
    const img = document.querySelector(sel);
    const src = img?.getAttribute("src");
    if (src) { logo = absolutize(src); break; }
  }

  const assetSet = new Set();
  document.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    if (src.startsWith("data:")) return;
    const abs = absolutize(src);
    if (!abs) return;
    const rect = img.getBoundingClientRect();
    if (rect.width < 32 || rect.height < 32) return;
    assetSet.add(abs);
  });
  const assets = Array.from(assetSet).slice(0, 24);

  return {
    metaTitle,
    metaDescription,
    headings: headings.slice(0, 60),
    codeBlocks: codeBlocks.slice(0, 30),
    paragraphs: paragraphs.slice(0, 30),
    favicon,
    ogImage,
    twitterImage,
    logo,
    assets,
  };
})();
`;
