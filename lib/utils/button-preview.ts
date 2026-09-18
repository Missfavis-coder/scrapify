import { BUTTON_PREVIEW_LIMITS } from "@/lib/constants/button-preview";
import type { ButtonStyles, ButtonVariantStyle } from "@/lib/types/extraction";

export function parsePxValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "0") return 0;
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeHeight(raw: string | null): {
  height: string | null;
  adjusted: boolean;
} {
  if (!raw) return { height: null, adjusted: false };
  const px = parsePxValue(raw);
  if (px === null) return { height: null, adjusted: true };
  const clamped = clamp(
    px,
    BUTTON_PREVIEW_LIMITS.minHeightPx,
    BUTTON_PREVIEW_LIMITS.maxHeightPx
  );
  return { height: `${clamped}px`, adjusted: clamped !== px };
}

function sanitizePadding(raw: string | null): string {
  const fallback = `0 ${BUTTON_PREVIEW_LIMITS.defaultPaddingXPx}px`;
  if (!raw) return fallback;
  const parts = raw.trim().split(/\s+/);
  const horizontalRaw =
    parts.length >= 2 ? parts[1] : parts.length === 1 ? parts[0] : null;
  const px = parsePxValue(horizontalRaw);
  if (px === null) return fallback;
  const clamped = clamp(
    px,
    BUTTON_PREVIEW_LIMITS.minPaddingXPx,
    BUTTON_PREVIEW_LIMITS.maxPaddingXPx
  );
  return `0 ${clamped}px`;
}

function sanitizeFontSize(raw: string | null): string | null {
  const px = parsePxValue(raw);
  if (px === null) return raw;
  const clamped = clamp(
    px,
    BUTTON_PREVIEW_LIMITS.minFontSizePx,
    BUTTON_PREVIEW_LIMITS.maxFontSizePx
  );
  return `${clamped}px`;
}

export function sanitizeButtonVariant(
  variant: ButtonVariantStyle,
  options: { isLink: boolean }
): ButtonVariantStyle {
  if (options.isLink) {
    return {
      ...variant,
      height: null,
      padding: null,
      lineHeight: null,
      fontSize: sanitizeFontSize(variant.fontSize),
    };
  }

  const { height, adjusted } = sanitizeHeight(variant.height);
  return {
    ...variant,
    height: height ?? `${BUTTON_PREVIEW_LIMITS.defaultHeightPx}px`,
    padding: sanitizePadding(variant.padding),
    lineHeight: adjusted ? null : variant.lineHeight,
    fontSize: sanitizeFontSize(variant.fontSize),
  };
}

export function sanitizeButtonStyles(styles: ButtonStyles): ButtonStyles {
  return {
    primary: styles.primary
      ? sanitizeButtonVariant(styles.primary, { isLink: false })
      : null,
    secondary: styles.secondary
      ? sanitizeButtonVariant(styles.secondary, { isLink: false })
      : null,
    link: styles.link
      ? sanitizeButtonVariant(styles.link, { isLink: true })
      : null,
  };
}

export function hasAnyButtonVariant(
  styles: ButtonStyles | null | undefined
): boolean {
  return Boolean(styles && (styles.primary || styles.secondary || styles.link));
}
