export const EXTRACT_LINK_CANDIDATES_SCRIPT = `
(() => {
  const out = [];
  const seen = new Set();

  const navs = Array.from(document.querySelectorAll("nav, aside, [role='navigation']"));
  const navInfo = new Map();
  for (const nav of navs) {
    const anchors = nav.querySelectorAll("a[href]");
    let i = 0;
    anchors.forEach((a) => {
      const href = a.getAttribute("href");
      if (!href) return;
      try {
        const abs = new URL(href, document.baseURI).href;
        if (!navInfo.has(abs)) {
          let depth = 0;
          let p = a.parentElement;
          while (p && p !== nav && depth < 10) {
            if ((p.tagName || "").toLowerCase() === "li") depth += 1;
            p = p.parentElement;
          }
          navInfo.set(abs, { navIndex: i, navDepth: depth });
        }
        i += 1;
      } catch {}
    });
  }

  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    try {
      const abs = new URL(href, document.baseURI).href;
      if (seen.has(abs)) return;
      seen.add(abs);
      const info = navInfo.get(abs);
      const text = (a.textContent || "").trim().slice(0, 200);
      out.push({
        url: abs,
        anchorText: text,
        navDepth: info ? info.navDepth : -1,
        navIndex: info ? info.navIndex : -1,
      });
    } catch {}
  });

  return out;
})();
`;
