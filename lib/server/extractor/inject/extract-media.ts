export const EXTRACT_MEDIA_SCRIPT = `
(() => {
  const MEDIA_CAP = 80;
  const MIN_BG_AREA = 40000;

  const absolutize = (url) => {
    if (!url) return null;
    const trimmed = String(url).trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return null;
    try { return new URL(trimmed, document.baseURI).href; } catch { return null; }
  };

  const seen = new Set();
  const media = [];
  const push = (rawUrl, kind, role, width, height) => {
    if (media.length >= MEDIA_CAP) return;
    const url = absolutize(rawUrl);
    if (!url) return;
    const key = kind + "|" + url;
    if (seen.has(key)) return;
    seen.add(key);
    media.push({
      url,
      kind,
      role: role || null,
      width: width && width > 0 ? Math.round(width) : null,
      height: height && height > 0 ? Math.round(height) : null,
    });
  };

  const largestFromSrcset = (srcset) => {
    if (!srcset) return null;
    let best = null;
    let bestW = -1;
    for (const part of srcset.split(",")) {
      const tokens = part.trim().split(/\\s+/);
      const candidate = tokens[0];
      if (!candidate) continue;
      const descriptor = tokens[1] || "";
      const w = descriptor.endsWith("w") ? parseInt(descriptor, 10) : 0;
      if (w >= bestW) { bestW = w; best = candidate; }
    }
    return best;
  };

  const roleFor = (el, width, height) => {
    const cls = (el.className && el.className.toString ? el.className.toString() : "").toLowerCase();
    const alt = (el.getAttribute && (el.getAttribute("alt") || "")).toLowerCase();
    const inHeader = el.closest && el.closest("header, nav");
    if (cls.includes("logo") || cls.includes("brand") || alt.includes("logo")) return "logo";
    if (inHeader && width && width < 260) return "logo";
    if (width >= window.innerWidth * 0.6 && height >= window.innerHeight * 0.5) return "hero";
    const gallery = el.closest && el.closest('[class*="gallery" i], [class*="carousel" i], [class*="slider" i], [role="list"]');
    if (gallery) return "gallery";
    return null;
  };

  document.querySelectorAll("img").forEach((img) => {
    const rect = img.getBoundingClientRect();
    const src = largestFromSrcset(img.getAttribute("srcset")) || img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || largestFromSrcset(img.getAttribute("data-srcset"));
    if (!src) return;
    if (rect.width && rect.width < 32 && rect.height < 32) return;
    push(src, "image", roleFor(img, rect.width, rect.height), rect.width, rect.height);
  });

  document.querySelectorAll("picture source").forEach((source) => {
    const src = largestFromSrcset(source.getAttribute("srcset")) || source.getAttribute("src");
    if (src) push(src, "image", null, null, null);
  });

  const collectBackgrounds = () => {
    const all = document.querySelectorAll("*");
    let scanned = 0;
    for (const el of all) {
      if (media.length >= MEDIA_CAP) break;
      if (scanned > 4000) break;
      scanned += 1;
      const style = window.getComputedStyle(el);
      const bg = style.backgroundImage;
      if (!bg || bg === "none" || bg.indexOf("url(") === -1) continue;
      const rect = el.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area < MIN_BG_AREA) continue;
      let rest = bg;
      while (rest.indexOf("url(") !== -1) {
        const start = rest.indexOf("url(") + 4;
        const end = rest.indexOf(")", start);
        if (end === -1) break;
        const raw = rest.slice(start, end).replace(/['"]/g, "").trim();
        const isHero = rect.top < window.innerHeight && area >= window.innerWidth * window.innerHeight * 0.4;
        push(raw, "background", isHero ? "hero" : "background", rect.width, rect.height);
        rest = rest.slice(end + 1);
      }
    }
  };
  collectBackgrounds();

  document.querySelectorAll("video").forEach((video) => {
    const rect = video.getBoundingClientRect();
    const role = roleFor(video, rect.width, rect.height);
    const primary = video.currentSrc || video.getAttribute("src");
    if (primary) push(primary, "video", role, rect.width, rect.height);
    video.querySelectorAll("source").forEach((s) => push(s.getAttribute("src"), "video", role, rect.width, rect.height));
    const poster = video.getAttribute("poster");
    if (poster) push(poster, "poster", role, rect.width, rect.height);
  });

  document.querySelectorAll("audio").forEach((audio) => {
    const primary = audio.getAttribute("src");
    if (primary) push(primary, "audio", null, null, null);
    audio.querySelectorAll("source").forEach((s) => push(s.getAttribute("src"), "audio", null, null, null));
  });

  const EMBED_HOSTS = ["youtube.com", "youtu.be", "youtube-nocookie.com", "vimeo.com", "wistia", "loom.com", "vidyard"];
  document.querySelectorAll("iframe[src]").forEach((frame) => {
    const src = frame.getAttribute("src") || "";
    const lower = src.toLowerCase();
    if (EMBED_HOSTS.some((host) => lower.includes(host))) {
      const rect = frame.getBoundingClientRect();
      push(src, "iframe", null, rect.width, rect.height);
    }
  });

  document.querySelectorAll("lottie-player[src], dotlottie-player[src], [data-animation-path]").forEach((el) => {
    const src = el.getAttribute("src") || el.getAttribute("data-animation-path");
    if (src) push(src, "lottie", null, null, null);
  });

  const scriptText = Array.from(document.scripts).map((s) => (s.src || "").toLowerCase()).join(" ");
  const w = window;
  const libraries = new Set();
  const has = (cond, name) => { if (cond) libraries.add(name); };

  has(w.THREE || scriptText.includes("three.module") || scriptText.includes("/three") || scriptText.includes("three.min"), "three");
  has(scriptText.includes("react-three") || scriptText.includes("@react-three") || scriptText.includes("r3f"), "react-three-fiber");
  has(w.BABYLON || scriptText.includes("babylon"), "babylon");
  has(w.PIXI || scriptText.includes("pixi"), "pixi");
  has(scriptText.includes("/ogl") || scriptText.includes("ogl.min"), "ogl");
  has(scriptText.includes("curtains"), "curtains");
  has(w.gsap || w.GSAP || scriptText.includes("gsap") || scriptText.includes("greensock"), "gsap");
  has(w.Lenis || scriptText.includes("lenis"), "lenis");
  has(w.LocomotiveScroll || scriptText.includes("locomotive"), "locomotive-scroll");
  has(w.ScrollMagic || scriptText.includes("scrollmagic"), "scrollmagic");
  has(w.lottie || scriptText.includes("lottie") || document.querySelector("lottie-player, dotlottie-player"), "lottie");
  has(w.rive || scriptText.includes("rive-app") || scriptText.includes("rive.js"), "rive");
  has(scriptText.includes("framer-motion") || scriptText.includes("framerusercontent") || document.querySelector("[data-framer-name]"), "framer-motion");
  has(w.Swiper || scriptText.includes("swiper"), "swiper");
  has(w.Matter || scriptText.includes("matter-js") || scriptText.includes("matter.min"), "matter-js");
  has(w.SplitType || scriptText.includes("split-type") || scriptText.includes("splittext"), "split-text");

  const scrollLibraries = new Set();
  if (w.ScrollTrigger || scriptText.includes("scrolltrigger")) { libraries.add("gsap-scrolltrigger"); scrollLibraries.add("gsap-scrolltrigger"); }
  if (libraries.has("lenis")) scrollLibraries.add("lenis");
  if (libraries.has("locomotive-scroll")) scrollLibraries.add("locomotive-scroll");
  if (libraries.has("scrollmagic")) scrollLibraries.add("scrollmagic");

  const canvases = Array.from(document.querySelectorAll("canvas"));
  let webgl = false;
  for (const c of canvases) {
    try {
      if (c.getContext && (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))) { webgl = true; break; }
    } catch { void 0; }
  }
  if (!webgl && canvases.length > 0) {
    const hint = ["three", "react-three-fiber", "babylon", "pixi", "ogl", "curtains"];
    if (hint.some((name) => libraries.has(name))) webgl = true;
  }

  return {
    media,
    stack: {
      webgl,
      canvasCount: canvases.length,
      libraries: Array.from(libraries),
      scrollLibraries: Array.from(scrollLibraries),
    },
    docScrollHeight: Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0
    ),
  };
})();
`;
