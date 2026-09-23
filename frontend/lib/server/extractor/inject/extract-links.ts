export const EXTRACT_LINKS_SCRIPT = `
(() => {
  const out = [];
  document.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    try {
      const abs = new URL(href, document.baseURI).href;
      out.push(abs);
    } catch {}
  });
  return out;
})();
`;
