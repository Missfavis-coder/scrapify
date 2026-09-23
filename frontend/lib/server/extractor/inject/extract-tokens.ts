
export const EXTRACT_TOKENS_SCRIPT = `
(() => {
  const RAW_LIMIT = 60;

  const rgbToHex = (raw) => {
    if (!raw) return null;
    const m = raw.match(/rgba?\\(\\s*(\\d+)[,\\s]+(\\d+)[,\\s]+(\\d+)(?:[,\\s/]+([\\d.]+))?\\s*\\)/);
    if (!m) return null;
    const a = m[4] !== undefined ? parseFloat(m[4]) : 1;
    if (a < 0.5) return null;
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
  };

  const isNeutralHex = (hex) => {
    const num = parseInt(hex.slice(1), 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max - min <= 18;
  };

  const isCtaLike = (el) => {
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "button") return true;
    const role = el.getAttribute && el.getAttribute("role");
    if (role === "button") return true;
    const cls =
      el.className && typeof el.className === "string"
        ? el.className.toLowerCase()
        : "";
    if (/(^|[\\s_-])(btn|button|cta|primary|submit|action)([\\s_-]|$)/.test(cls)) {
      return true;
    }
    return false;
  };

  const colorWeights = new Map();
  const ctaWeights = new Map();
  const logoWeights = new Map();
  const fonts = new Set();
  const headingFontWeights = new Map();
  const bodyFontWeights = new Map();
  const buttonFontWeights = new Map();
  const monoFontWeights = new Map();
  const fontSizes = new Set();
  const fontWeights = new Set();
  const radii = new Set();
  const shadows = new Set();
  const spacing = new Set();
  const transitions = new Set();
  const easings = new Set();
  const durations = new Set();
  const interactiveCursorWeights = new Map();
  const linkColorWeights = new Map();
  let customCursor = null;

  const addWeight = (map, hex, weight) => {
    if (!hex || weight <= 0) return;
    map.set(hex, (map.get(hex) || 0) + weight);
  };

  const buttonCandidates = [];

  const parseRadiusPx = (raw) => {
    if (!raw) return null;
    const parts = raw.trim().split(/\\s+/);
    let max = 0;
    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower.endsWith("px")) {
        const n = parseFloat(lower);
        if (!Number.isNaN(n) && isFinite(n)) max = Math.max(max, n);
      } else if (lower.endsWith("rem")) {
        const n = parseFloat(lower);
        if (!Number.isNaN(n) && isFinite(n)) max = Math.max(max, n * 16);
      } else if (lower.endsWith("%")) {
        const n = parseFloat(lower);
        if (!Number.isNaN(n) && n >= 50) return 9999;
      }
    }
    return max > 0 ? max : null;
  };

  const normalizeRadius = (raw, height) => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "0px") return null;
    const px = parseRadiusPx(trimmed);
    if (px === null) return trimmed;
    if (px >= 999 || px > 200) return "9999px";
    if (height > 0 && px >= height / 2 - 0.5) return "9999px";
    return Math.round(px * 100) / 100 + "px";
  };

  const buildVariant = (st, rc) => {
    const maxBorder = Math.max(
      parseFloat(st.borderTopWidth) || 0,
      parseFloat(st.borderRightWidth) || 0,
      parseFloat(st.borderBottomWidth) || 0,
      parseFloat(st.borderLeftWidth) || 0
    );
    const borderStyle = st.borderTopStyle;
    const borderColor = rgbToHex(st.borderTopColor);
    const hasBorder =
      maxBorder > 0 && borderStyle && borderStyle !== "none" && borderColor;
    const radiusRaw = st.getPropertyValue("border-radius");
    const elHeight = Math.round(rc.height);
    const radiusNorm = normalizeRadius(radiusRaw, elHeight);
    const lineHeight = st.lineHeight;
    const letterSpacing = st.letterSpacing;
    const textTransform = st.textTransform;
    const decoration =
      st.getPropertyValue("text-decoration-line") || st.textDecorationLine || "";
    const shadow = st.getPropertyValue("box-shadow");
    return {
      backgroundColor: rgbToHex(st.backgroundColor),
      textColor: rgbToHex(st.color),
      border: hasBorder ? maxBorder + "px " + borderStyle + " " + borderColor : null,
      borderRadius: radiusNorm,
      padding:
        st.paddingTop +
        " " +
        st.paddingRight +
        " " +
        st.paddingBottom +
        " " +
        st.paddingLeft,
      fontSize: st.fontSize || null,
      fontWeight: st.fontWeight || null,
      fontFamily: st.fontFamily || null,
      lineHeight: lineHeight && lineHeight !== "normal" ? lineHeight : null,
      letterSpacing:
        letterSpacing && letterSpacing !== "normal" ? letterSpacing : null,
      textTransform: textTransform && textTransform !== "none" ? textTransform : null,
      textDecoration: decoration.indexOf("underline") !== -1 ? "underline" : null,
      boxShadow: shadow && shadow !== "none" ? shadow : null,
      height: Math.round(rc.height) + "px",
    };
  };

  const elements = document.querySelectorAll("*");

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    const area = visible ? rect.width * rect.height : 0;

    const style = window.getComputedStyle(el);

    if (visible && area >= 64) {
      const bgHex = rgbToHex(style.backgroundColor);
      if (bgHex) {
        addWeight(colorWeights, bgHex, area);
        if (!isNeutralHex(bgHex) && isCtaLike(el)) {
          addWeight(ctaWeights, bgHex, area);
        }
      }

      const borderTopWidth = parseFloat(style.borderTopWidth) || 0;
      if (borderTopWidth > 0) {
        const borderHex = rgbToHex(style.borderTopColor);
        if (borderHex) {
          const perimeter = (rect.width + rect.height) * 2;
          addWeight(colorWeights, borderHex, perimeter * borderTopWidth * 0.15);
        }
      }

      const isLeaf = el.children.length === 0;
      if (isLeaf) {
        const text = (el.textContent || "").trim();
        if (text.length > 0) {
          const colorHex = rgbToHex(style.color);
          if (colorHex) {
            const fontSize = parseFloat(style.fontSize) || 16;
            const charCount = Math.min(text.length, 80);
            const textArea = fontSize * 0.55 * charCount * 1.4;
            addWeight(colorWeights, colorHex, Math.min(textArea, area) * 0.6);
          }
        }
      }

      if (el.namespaceURI === "http://www.w3.org/2000/svg") {
        const fillHex = rgbToHex(style.fill);
        if (fillHex && !isNeutralHex(fillHex)) {
          addWeight(colorWeights, fillHex, area * 1.2);
          const ancestor = el.closest("a, header, [class*='logo'], [class*='brand'], [aria-label*='logo' i]");
          if (ancestor) {
            addWeight(logoWeights, fillHex, area * 2);
          }
        }
        const strokeHex = rgbToHex(style.stroke);
        if (strokeHex && !isNeutralHex(strokeHex)) {
          addWeight(colorWeights, strokeHex, area * 0.4);
        }
      }
    }

    const family = style.getPropertyValue("font-family");
    const familyName = family
      ? family.split(",")[0].replace(/['"]/g, "").trim()
      : "";
    if (familyName) {
      fonts.add(familyName);

      const tagName = el.tagName ? el.tagName.toLowerCase() : "";
      const text = (el.textContent || "").trim();
      const fontSizePx = parseFloat(style.fontSize) || 16;
      const isMonoFamily = /mono/i.test(family);

      if (text.length > 0) {
        if (/^h[1-6]$/.test(tagName)) {
          addWeight(headingFontWeights, familyName, Math.min(text.length, 120) * fontSizePx);
        } else if (tagName === "button" || isCtaLike(el)) {
          addWeight(buttonFontWeights, familyName, Math.min(text.length, 60));
        } else if (tagName === "code" || tagName === "pre" || isMonoFamily) {
          addWeight(monoFontWeights, familyName, Math.min(text.length, 120));
        } else if (el.children.length === 0) {
          addWeight(bodyFontWeights, familyName, Math.min(text.length, 200));
        }
      }
    }

    const size = parseFloat(style.getPropertyValue("font-size"));
    if (!Number.isNaN(size)) fontSizes.add(Math.round(size));

    const weight = parseInt(style.getPropertyValue("font-weight"), 10);
    if (!Number.isNaN(weight)) fontWeights.add(weight);

    const radiusRaw = style.getPropertyValue("border-radius");
    const radiusNorm = normalizeRadius(radiusRaw, Math.round(rect.height));
    if (radiusNorm) radii.add(radiusNorm);

    const shadow = style.getPropertyValue("box-shadow");
    if (shadow && shadow !== "none") shadows.add(shadow);

    const padding = style.getPropertyValue("padding");
    if (padding && padding !== "0px") spacing.add(padding);

    const transition = style.getPropertyValue("transition");
    if (transition && transition !== "none" && !transition.startsWith("all 0s")) {
      transitions.add(transition.trim());
    }

    const transitionDuration = style.getPropertyValue("transition-duration");
    if (transitionDuration && transitionDuration !== "0s") {
      durations.add(transitionDuration.trim());
    }

    const transitionTiming = style.getPropertyValue("transition-timing-function");
    if (transitionTiming && transitionTiming !== "ease" && transitionTiming !== "linear") {
      easings.add(transitionTiming.trim());
    }

    const animationDuration = style.getPropertyValue("animation-duration");
    if (animationDuration && animationDuration !== "0s") {
      durations.add(animationDuration.trim());
    }

    const animationTiming = style.getPropertyValue("animation-timing-function");
    if (animationTiming && animationTiming !== "ease") {
      easings.add(animationTiming.trim());
    }

    const cursor = style.getPropertyValue("cursor");
    if (cursor) {
      if (cursor.indexOf("url(") !== -1 && !customCursor) {
        customCursor = cursor.trim();
      }
      const cursorTag = el.tagName ? el.tagName.toLowerCase() : "";
      const role = el.getAttribute ? el.getAttribute("role") : null;
      const interactive =
        cursorTag === "button" ||
        cursorTag === "a" ||
        cursorTag === "select" ||
        cursorTag === "summary" ||
        role === "button" ||
        role === "link" ||
        isCtaLike(el);
      if (interactive && cursor !== "auto" && cursor !== "default") {
        const keyword = cursor.split(",").pop();
        if (keyword) addWeight(interactiveCursorWeights, keyword.trim(), 1);
      }
    }

    const candidateTag = el.tagName ? el.tagName.toLowerCase() : "";
    const ctaCandidate = isCtaLike(el);
    const anchorCandidate = candidateTag === "a";

    if (anchorCandidate && !ctaCandidate && visible) {
      const linkText = (el.textContent || "").trim();
      const linkColorHex = rgbToHex(style.color);
      if (linkColorHex && !isNeutralHex(linkColorHex) && linkText.length > 0) {
        const inChrome = el.closest("nav, header, footer");
        const weight = inChrome ? 0.25 : 1;
        addWeight(
          linkColorWeights,
          linkColorHex,
          Math.min(linkText.length, 48) * weight
        );
      }
    }

    if (
      visible &&
      (ctaCandidate || anchorCandidate) &&
      rect.width >= 24 &&
      rect.height >= 14 &&
      rect.height <= 96 &&
      rect.width <= 560 &&
      buttonCandidates.length < 800
    ) {
      const variant = buildVariant(style, rect);
      const coloredText = variant.textColor && !isNeutralHex(variant.textColor);
      const interesting =
        variant.backgroundColor !== null ||
        variant.border !== null ||
        variant.textDecoration === "underline" ||
        coloredText;
      if (ctaCandidate || interesting) {
        buttonCandidates.push({
          v: variant,
          score: rect.width * rect.height,
          cta: ctaCandidate,
          anchor: anchorCandidate,
        });
      }
    }
  }

  const readSchemeBg = (node) => {
    if (!node) return null;
    return rgbToHex(window.getComputedStyle(node).backgroundColor);
  };
  const schemeBg = readSchemeBg(document.body) || readSchemeBg(document.documentElement);
  let colorScheme = "light";
  if (schemeBg) {
    const schemeNum = parseInt(schemeBg.slice(1), 16);
    const sr = (schemeNum >> 16) & 0xff;
    const sg = (schemeNum >> 8) & 0xff;
    const sb = schemeNum & 0xff;
    const luminance = 0.299 * sr + 0.587 * sg + 0.114 * sb;
    colorScheme = luminance < 128 ? "dark" : "light";
  }

  const sortedByWeight = [...colorWeights.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  const pickHeaviest = (map) => {
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? entries[0][0] : null;
  };

  let primary = pickHeaviest(ctaWeights) || pickHeaviest(logoWeights);
  if (!primary) {
    const nonNeutralOverall = sortedByWeight.find(([hex]) => !isNeutralHex(hex));
    primary = nonNeutralOverall ? nonNeutralOverall[0] : null;
  }

  const filledButtons = buttonCandidates.filter((c) => c.v.backgroundColor !== null);
  const outlineButtons = buttonCandidates.filter(
    (c) => c.v.backgroundColor === null && c.v.border !== null
  );
  const linkButtons = buttonCandidates.filter(
    (c) =>
      c.v.backgroundColor === null &&
      c.v.border === null &&
      ((c.anchor && !c.cta) || c.v.textDecoration === "underline")
  );

  const pickPrimaryButton = () => {
    if (filledButtons.length === 0) return null;
    const ranked = filledButtons.slice().sort((a, b) => {
      const aMatch = a.v.backgroundColor === primary ? 1 : 0;
      const bMatch = b.v.backgroundColor === primary ? 1 : 0;
      if (aMatch !== bMatch) return bMatch - aMatch;
      const aHue = a.v.backgroundColor && !isNeutralHex(a.v.backgroundColor) ? 1 : 0;
      const bHue = b.v.backgroundColor && !isNeutralHex(b.v.backgroundColor) ? 1 : 0;
      if (aHue !== bHue) return bHue - aHue;
      return b.score - a.score;
    });
    return ranked[0].v;
  };

  const pickSecondaryButton = (primaryVariant) => {
    if (outlineButtons.length === 0) return null;
    const ctaOutlines = outlineButtons.filter((c) => c.cta);
    const pool = ctaOutlines.length > 0 ? ctaOutlines : outlineButtons;
    const ranked = pool.slice().sort((a, b) => {
      const aCta = a.cta ? 1 : 0;
      const bCta = b.cta ? 1 : 0;
      if (aCta !== bCta) return bCta - aCta;
      if (primaryVariant && primaryVariant.height) {
        const pH = parseInt(primaryVariant.height, 10) || 0;
        if (pH > 0) {
          const aH = parseInt(a.v.height, 10) || 0;
          const bH = parseInt(b.v.height, 10) || 0;
          const aDiff = Math.abs(aH - pH);
          const bDiff = Math.abs(bH - pH);
          if (aDiff !== bDiff) return aDiff - bDiff;
        }
      }
      return b.score - a.score;
    });
    return ranked[0].v;
  };

  const pickLinkButton = () => {
    const measuredLinkColor = pickHeaviest(linkColorWeights);
    if (linkButtons.length === 0) {
      if (!measuredLinkColor) return null;
      return {
        backgroundColor: null,
        textColor: measuredLinkColor,
        border: null,
        borderRadius: null,
        padding: null,
        fontSize: null,
        fontWeight: null,
        fontFamily: null,
        lineHeight: null,
        letterSpacing: null,
        textTransform: null,
        textDecoration: "underline",
        boxShadow: null,
        height: null,
      };
    }
    const ranked = linkButtons.slice().sort((a, b) => {
      const aAnchor = a.anchor && !a.cta ? 1 : 0;
      const bAnchor = b.anchor && !b.cta ? 1 : 0;
      if (aAnchor !== bAnchor) return bAnchor - aAnchor;
      const aUnder = a.v.textDecoration === "underline" ? 1 : 0;
      const bUnder = b.v.textDecoration === "underline" ? 1 : 0;
      if (aUnder !== bUnder) return bUnder - aUnder;
      const aCta = a.cta ? 1 : 0;
      const bCta = b.cta ? 1 : 0;
      if (aCta !== bCta) return aCta - bCta;
      return b.score - a.score;
    });
    const picked = ranked[0].v;
    if (measuredLinkColor && picked.textColor !== measuredLinkColor) {
      return Object.assign({}, picked, { textColor: measuredLinkColor });
    }
    return picked;
  };

  const primaryVariant = pickPrimaryButton();

  const buttons = {
    primary: primaryVariant,
    secondary: pickSecondaryButton(primaryVariant),
    link: pickLinkButton(),
  };

  const colors = sortedByWeight.slice(0, RAW_LIMIT).map(([hex]) => hex);
  const coreColors = sortedByWeight.slice(0, 6).map(([hex]) => hex);

  const fontRoles = {
    heading: pickHeaviest(headingFontWeights),
    body: pickHeaviest(bodyFontWeights),
    button: pickHeaviest(buttonFontWeights),
    mono: pickHeaviest(monoFontWeights),
  };

  const cursors = {
    interactive: pickHeaviest(interactiveCursorWeights) || "pointer",
    custom: customCursor,
  };

  return {
    colors,
    coreColors,
    fontRoles,
    cursors,
    buttons,
    usesShadows: shadows.size > 2,
    primary,
    fonts: Array.from(fonts).slice(0, 6),
    fontSizes: Array.from(fontSizes).sort((a, b) => a - b),
    fontWeights: Array.from(fontWeights).sort((a, b) => a - b),
    borderRadii: Array.from(radii).slice(0, 10),
    shadows: Array.from(shadows).slice(0, 10),
    spacing: Array.from(spacing).slice(0, 15),
    transitions: Array.from(transitions).slice(0, 12),
    easings: Array.from(easings).slice(0, 8),
    durations: Array.from(durations).slice(0, 8),
    colorScheme,
  };
})();
`;
