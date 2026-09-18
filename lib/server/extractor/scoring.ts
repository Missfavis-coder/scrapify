import type { GenerationMode } from "@/lib/types/generation";

const HIGH_VALUE_PATHS: { hint: string; weight: number }[] = [
  { hint: "/quickstart", weight: 100 },
  { hint: "/getting-started", weight: 95 },
  { hint: "/get-started", weight: 95 },
  { hint: "/installation", weight: 80 },
  { hint: "/install", weight: 75 },
  { hint: "/setup", weight: 70 },
  { hint: "/introduction", weight: 65 },
  { hint: "/overview", weight: 60 },
  { hint: "/concepts", weight: 55 },
  { hint: "/reference", weight: 80 },
  { hint: "/api-reference", weight: 90 },
  { hint: "/api/", weight: 70 },
  { hint: "/sdk", weight: 65 },
  { hint: "/tutorial", weight: 55 },
  { hint: "/guide", weight: 45 },
  { hint: "/guides", weight: 45 },
  { hint: "/docs", weight: 35 },
  { hint: "/manual", weight: 35 },
  { hint: "/learn", weight: 30 },
  { hint: "/examples", weight: 30 },
];

const NEGATIVE_PATHS: string[] = [
  "/changelog",
  "/release",
  "/blog",
  "/news",
  "/pricing",
  "/signup",
  "/sign-up",
  "/login",
  "/sign-in",
  "/signin",
  "/careers",
  "/jobs",
  "/about",
  "/contact",
  "/legal",
  "/terms",
  "/privacy",
  "/cookie",
];

const EXCLUDED_FILE_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".gif",
  ".zip",
  ".tar",
  ".gz",
  ".mp4",
  ".webm",
];

const HIGH_VALUE_ANCHOR_TERMS = [
  "quickstart",
  "getting started",
  "get started",
  "installation",
  "install",
  "introduction",
  "overview",
  "reference",
  "api",
  "sdk",
  "guide",
  "tutorial",
];

const MODE_PATH_BIASES: Record<GenerationMode, Record<string, number>> = {
  api: { "/api": 30, "/reference": 25, "/endpoints": 25, "/webhook": 20 },
  library: { "/api": 20, "/reference": 25, "/concepts": 15, "/sdk": 25 },
  design: {},
  motion: {},
  generic: {},
};

export interface LinkCandidate {
  url: string;
  anchorText: string;
  navDepth: number;
  navIndex: number;
}

export interface ScoredLink {
  url: string;
  score: number;
  reason: string;
}

interface ScoreInput {
  candidates: LinkCandidate[];
  rootHost: string;
  rootPathPrefix: string | null;
  mode: GenerationMode;
}

export function scoreLinks(input: ScoreInput): ScoredLink[] {
  const seen = new Map<string, ScoredLink>();
  for (const cand of input.candidates) {
    const parsed = safeUrl(cand.url);
    if (!parsed) continue;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;

    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== input.rootHost) continue;

    const path = parsed.pathname.toLowerCase();
    if (EXCLUDED_FILE_EXTENSIONS.some((ext) => path.endsWith(ext))) continue;
    if (NEGATIVE_PATHS.some((hint) => path.includes(hint))) continue;

    const canonical = canonicalize(parsed.toString());
    const matchesPrefix =
      input.rootPathPrefix !== null && path.startsWith(input.rootPathPrefix);
    const pathHint = HIGH_VALUE_PATHS.find((h) => path.includes(h.hint));
    if (!matchesPrefix && !pathHint) continue;

    const score = computeScore({ candidate: cand, path, pathHint, mode: input.mode });
    const reason = pathHint
      ? `path:${pathHint.hint}`
      : matchesPrefix
        ? `prefix:${input.rootPathPrefix}`
        : "host";

    const existing = seen.get(canonical);
    if (!existing || existing.score < score) {
      seen.set(canonical, { url: canonical, score, reason });
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.score - a.score);
}

interface ComputeInput {
  candidate: LinkCandidate;
  path: string;
  pathHint: { hint: string; weight: number } | undefined;
  mode: GenerationMode;
}

function computeScore(input: ComputeInput): number {
  let score = 0;
  if (input.pathHint) score += input.pathHint.weight;

  const modeBias = MODE_PATH_BIASES[input.mode];
  for (const [hint, weight] of Object.entries(modeBias)) {
    if (input.path.includes(hint)) score += weight;
  }

  const anchor = input.candidate.anchorText.toLowerCase();
  if (anchor.length > 0) {
    for (const term of HIGH_VALUE_ANCHOR_TERMS) {
      if (anchor.includes(term)) {
        score += 10;
        break;
      }
    }
    if (anchor.length >= 6 && anchor.length <= 60) score += 4;
  }

  if (input.candidate.navDepth > 0) {
    score += Math.max(0, 12 - input.candidate.navDepth * 4);
  }

  if (input.candidate.navIndex >= 0 && input.candidate.navIndex < 30) {
    score += Math.max(0, 8 - Math.floor(input.candidate.navIndex / 4));
  }

  const segments = input.path.split("/").filter(Boolean).length;
  score -= Math.max(0, segments - 4);

  return score;
}

export function canonicalize(url: string): string {
  const parsed = safeUrl(url);
  if (!parsed) return url;
  parsed.hash = "";
  parsed.search = "";
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }
  parsed.hostname = parsed.hostname.replace(/^www\./, "");
  return parsed.toString();
}

export function safeUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function safeHost(url: string): string | null {
  const parsed = safeUrl(url);
  if (!parsed) return null;
  return parsed.hostname.replace(/^www\./, "");
}

export function safePathPrefix(url: string): string | null {
  const parsed = safeUrl(url);
  if (!parsed) return null;
  const path = parsed.pathname.toLowerCase();
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  return `/${segments[0]}`;
}
