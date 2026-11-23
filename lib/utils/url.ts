import { LIMITS } from "@/lib/constants/limits";

export interface NormalizedUrl {
  href: string;
  host: string;
  origin: string;
}

export function normalizeUrl(input: string): NormalizedUrl | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > LIMITS.maxUrlLength) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;

    return {
      href: parsed.href,
      host: parsed.hostname.replace(/^www\./, ""),
      origin: parsed.origin,
    };
  } catch {
    return null;
  }
}

export function isValidUrl(input: string): boolean {
  return normalizeUrl(input) !== null;
}

const FALLBACK_PUBLIC_URL = "http://localhost:9011";

export function getPublicSiteUrl(): string {
  const explicit = process.env.GETSKILLMD_PUBLIC_URL;
  if (explicit && explicit.trim().length > 0) {
    return explicit.replace(/\/$/, "");
  }
  const nextPublic = process.env.NEXT_PUBLIC_APP_URL;
  if (nextPublic && nextPublic.trim().length > 0) {
    return nextPublic.replace(/\/$/, "");
  }
  return FALLBACK_PUBLIC_URL;
}
