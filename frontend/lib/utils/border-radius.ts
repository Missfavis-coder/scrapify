const PILL_THRESHOLD_PX = 999;

export function parseRadiusPx(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/\s+/);
  let max = 0;

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower.endsWith("px")) {
      const n = parseFloat(lower);
      if (!Number.isNaN(n) && Number.isFinite(n)) max = Math.max(max, n);
      continue;
    }
    if (lower.endsWith("rem")) {
      const n = parseFloat(lower);
      if (!Number.isNaN(n) && Number.isFinite(n)) max = Math.max(max, n * 16);
      continue;
    }
    if (lower.endsWith("%")) {
      const n = parseFloat(lower);
      if (!Number.isNaN(n) && n >= 50) return PILL_THRESHOLD_PX;
    }
  }

  return max > 0 ? max : null;
}

export function normalizeBorderRadius(
  value: string | null | undefined,
  elementHeight?: number | null
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0px") return null;

  const px = parseRadiusPx(trimmed);
  if (px === null) return trimmed;

  if (px >= PILL_THRESHOLD_PX || px > 200) return "9999px";
  if (elementHeight && elementHeight > 0 && px >= elementHeight / 2 - 0.5) {
    return "9999px";
  }

  const rounded = Math.round(px * 100) / 100;
  return `${rounded}px`;
}

export function describeBorderRadius(value: string): string {
  const px = parseRadiusPx(value);
  if (px === null) return value;
  if (px >= PILL_THRESHOLD_PX) return "full";
  return `${Math.round(px)}px`;
}
