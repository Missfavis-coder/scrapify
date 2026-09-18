import { parseColorGroups } from "@/lib/utils/color-groups";

const HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

interface Hsl {
  h: number;
  s: number;
  l: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const NEUTRAL_SATURATION_MAX = 0.12;
const NEAR_BLACK_LIGHTNESS = 0.08;
const NEAR_WHITE_LIGHTNESS = 0.94;

const CHROMATIC_HUE_THRESHOLD = 0.05;
const CHROMATIC_SAT_THRESHOLD = 0.12;
const CHROMATIC_LIGHT_THRESHOLD = 0.06;

const NEUTRAL_LIGHT_THRESHOLD = 0.04;

export function deriveCardPalette(
  skillMd: string | null | undefined,
  fallbackColors: ReadonlyArray<string> | null | undefined,
  size: number
): string[] {
  const groups = parseColorGroups(skillMd);
  if (groups.length > 0) {
    const ordered: string[] = [];
    for (const group of groups) {
      for (const color of group.colors) ordered.push(color.hex);
    }
    const ranked = prioritizePalette(ordered, size);
    if (ranked.length > 0) return ranked;
  }
  return prioritizePalette(fallbackColors ?? [], size);
}

export function prioritizePalette(
  input: ReadonlyArray<string>,
  size: number
): string[] {
  const seen = new Set<string>();
  const chromatic: string[] = [];
  const neutral: string[] = [];

  for (const raw of input) {
    const normalized = normalizeHex(raw);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    if (isNeutral(normalized)) {
      neutral.push(normalized);
    } else {
      chromatic.push(normalized);
    }
  }

  const groupedChromatic = clusterChromatic(chromatic);
  const groupedNeutral = clusterNeutral(neutral);

  return [...groupedChromatic, ...groupedNeutral].slice(0, size);
}

function clusterChromatic(colors: string[]): string[] {
  const result: { rep: string; hsl: Hsl }[] = [];
  for (const hex of colors) {
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    const hsl = rgbToHsl(rgb);
    const existing = result.find((c) =>
      isChromaticallyClose(c.hsl, hsl)
    );
    if (!existing) {
      result.push({ rep: hex, hsl });
    }
  }
  return result.map((c) => c.rep);
}

function clusterNeutral(colors: string[]): string[] {
  const result: { rep: string; hsl: Hsl }[] = [];
  for (const hex of colors) {
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    const hsl = rgbToHsl(rgb);
    const existing = result.find(
      (c) => Math.abs(c.hsl.l - hsl.l) <= NEUTRAL_LIGHT_THRESHOLD
    );
    if (!existing) {
      result.push({ rep: hex, hsl });
    }
  }
  return result.map((c) => c.rep);
}

function isChromaticallyClose(a: Hsl, b: Hsl): boolean {
  const hueDelta = Math.min(Math.abs(a.h - b.h), 1 - Math.abs(a.h - b.h));
  return (
    hueDelta <= CHROMATIC_HUE_THRESHOLD &&
    Math.abs(a.s - b.s) <= CHROMATIC_SAT_THRESHOLD &&
    Math.abs(a.l - b.l) <= CHROMATIC_LIGHT_THRESHOLD
  );
}

function isNeutral(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const hsl = rgbToHsl(rgb);
  if (hsl.l <= NEAR_BLACK_LIGHTNESS) return true;
  if (hsl.l >= NEAR_WHITE_LIGHTNESS) return true;
  return hsl.s <= NEUTRAL_SATURATION_MAX;
}

function normalizeHex(raw: string): string | null {
  const trimmed = raw.trim();
  const match = trimmed.match(HEX_RE);
  if (!match) return null;
  let value = match[1].toLowerCase();
  if (value.length === 3) {
    value = value
      .split("")
      .map((c) => c + c)
      .join("");
  } else if (value.length === 8) {
    value = value.slice(0, 6);
  }
  return `#${value}`;
}

function hexToRgb(hex: string): Rgb | null {
  const value = hex.replace("#", "");
  if (value.length !== 6) return null;
  const num = Number.parseInt(value, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hslToHex({ h, s, l }: Hsl): string {
  if (s === 0) {
    const value = Math.round(l * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${value}${value}${value}`;
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let channel = t;
    if (channel < 0) channel += 1;
    if (channel > 1) channel -= 1;
    if (channel < 1 / 6) return p + (q - p) * 6 * channel;
    if (channel < 1 / 2) return q;
    if (channel < 2 / 3) return p + (q - p) * (2 / 3 - channel) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hue2rgb(p, q, h + 1 / 3);
  const g = hue2rgb(p, q, h);
  const b = hue2rgb(p, q, h - 1 / 3);
  const toHex = (channel: number) =>
    Math.round(channel * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generateShades(hex: string, steps: number): string[] {
  const normalized = normalizeHex(hex);
  if (!normalized) return [hex];
  if (steps <= 1) return [normalized];

  const rgb = hexToRgb(normalized);
  if (!rgb) return [normalized];

  const base = rgbToHsl(rgb);
  const mid = (steps - 1) / 2;
  const minLightness = 0.04;
  const maxLightness = 0.96;
  const downRange = base.l - minLightness;
  const upRange = maxLightness - base.l;
  const downStep = mid > 0 ? downRange / mid : 0;
  const upStep = mid > 0 ? upRange / mid : 0;

  return Array.from({ length: steps }, (_, index) => {
    const offset = index - mid;
    const lightness =
      offset < 0
        ? base.l + offset * downStep
        : offset > 0
          ? base.l + offset * upStep
          : base.l;

    return hslToHex({
      h: base.h,
      s: base.s,
      l: clamp(lightness, minLightness, maxLightness),
    });
  });
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      default:
        h = (rNorm - gNorm) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}
