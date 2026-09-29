import { normalizeUrl } from "@/lib/utils/url";
import type { GenerationMode, ModeDetection } from "@/lib/types/generation";
import { DEFAULT_MODE } from "../constants/modes";

const LIBRARY_HOSTS = new Set<string>([
  "npmjs.com",
  "pypi.org",
  "crates.io",
  "rubygems.org",
  "pkg.go.dev",
  "docs.rs",
  "hex.pm",
  "packagist.org",
  "rubydoc.info",
  "godoc.org",
]);

const SCORE_THRESHOLD = 30;
const FUZZY_MIN_LEN = 5;
const FUZZY_MAX_DISTANCE = 1;

interface KeywordSignal {
  kw: string;
  mode: TargetMode;
  weight: number;
}

type TargetMode = GenerationMode | "docs-marker";

const SUBDOMAIN_SIGNALS: KeywordSignal[] = [
  { kw: "api", mode: "api", weight: 110 },
  { kw: "developer", mode: "api", weight: 90 },
  { kw: "developers", mode: "api", weight: 90 },
  { kw: "dev", mode: "api", weight: 35 },
  { kw: "reference", mode: "api", weight: 80 },
  { kw: "rest", mode: "api", weight: 70 },
  { kw: "graphql", mode: "api", weight: 90 },
  { kw: "openapi", mode: "api", weight: 100 },
  { kw: "swagger", mode: "api", weight: 90 },
  { kw: "redoc", mode: "api", weight: 90 },
  { kw: "sdk", mode: "library", weight: 90 },
  { kw: "sdks", mode: "library", weight: 90 },
  { kw: "wiki", mode: "generic", weight: 70 },
  { kw: "help", mode: "generic", weight: 55 },
  { kw: "support", mode: "generic", weight: 45 },
  { kw: "kb", mode: "generic", weight: 40 },
  { kw: "knowledge", mode: "generic", weight: 40 },
  { kw: "manual", mode: "generic", weight: 60 },
  { kw: "handbook", mode: "generic", weight: 60 },
  { kw: "docs", mode: "docs-marker", weight: 0 },
  { kw: "doc", mode: "docs-marker", weight: 0 },
  { kw: "documentation", mode: "docs-marker", weight: 0 },
  { kw: "learn", mode: "docs-marker", weight: 0 },
];

const PATH_SIGNALS: KeywordSignal[] = [
  { kw: "apireference", mode: "api", weight: 130 },
  { kw: "api-reference", mode: "api", weight: 130 },
  { kw: "api", mode: "api", weight: 70 },
  { kw: "reference", mode: "api", weight: 70 },
  { kw: "references", mode: "api", weight: 60 },
  { kw: "endpoints", mode: "api", weight: 80 },
  { kw: "endpoint", mode: "api", weight: 70 },
  { kw: "openapi", mode: "api", weight: 110 },
  { kw: "swagger", mode: "api", weight: 100 },
  { kw: "redoc", mode: "api", weight: 100 },
  { kw: "graphql", mode: "api", weight: 90 },
  { kw: "webhooks", mode: "api", weight: 60 },
  { kw: "webhook", mode: "api", weight: 60 },
  { kw: "rest", mode: "api", weight: 40 },
  { kw: "developers", mode: "api", weight: 70 },
  { kw: "developer", mode: "api", weight: 70 },

  { kw: "sdk", mode: "library", weight: 90 },
  { kw: "sdks", mode: "library", weight: 90 },
  { kw: "package", mode: "library", weight: 80 },
  { kw: "packages", mode: "library", weight: 70 },
  { kw: "library", mode: "library", weight: 50 },
  { kw: "libraries", mode: "library", weight: 50 },
  { kw: "cli", mode: "library", weight: 60 },
  { kw: "framework", mode: "library", weight: 30 },
  { kw: "modules", mode: "library", weight: 30 },

  { kw: "wiki", mode: "generic", weight: 80 },
  { kw: "manual", mode: "generic", weight: 70 },
  { kw: "handbook", mode: "generic", weight: 70 },
  { kw: "help", mode: "generic", weight: 50 },
  { kw: "support", mode: "generic", weight: 40 },
  { kw: "guide", mode: "generic", weight: 35 },
  { kw: "guides", mode: "generic", weight: 35 },
  { kw: "tutorial", mode: "generic", weight: 30 },
  { kw: "tutorials", mode: "generic", weight: 30 },
  { kw: "cookbook", mode: "generic", weight: 35 },
  { kw: "recipes", mode: "generic", weight: 25 },
  { kw: "faq", mode: "generic", weight: 35 },
  { kw: "book", mode: "generic", weight: 25 },
  { kw: "guidebook", mode: "generic", weight: 50 },

  { kw: "docs", mode: "docs-marker", weight: 0 },
  { kw: "doc", mode: "docs-marker", weight: 0 },
  { kw: "documentation", mode: "docs-marker", weight: 0 },
];

interface FileSignal {
  matcher: RegExp;
  mode: GenerationMode;
  weight: number;
  reason: string;
}

const FILE_SIGNALS: FileSignal[] = [
  {
    matcher: /openapi\.(json|ya?ml)$/i,
    mode: "api",
    weight: 140,
    reason: "OpenAPI spec file",
  },
  {
    matcher: /swagger\.(json|ya?ml)$/i,
    mode: "api",
    weight: 130,
    reason: "Swagger spec file",
  },
  {
    matcher: /readme\.md$/i,
    mode: "library",
    weight: 30,
    reason: "README in docs path",
  },
];

const VERSION_SEGMENT_RE = /^v\d+(?:[._-]\d+){0,3}$/i;

interface AggregatedScore {
  mode: GenerationMode;
  score: number;
  reason: string;
}

interface MatchedSignal {
  mode: TargetMode;
  weight: number;
  reason: string;
}

export function detectModeFromUrl(input: string): ModeDetection {
  const normalized = normalizeUrl(input);
  if (!normalized) {
    return { mode: DEFAULT_MODE, reason: "couldn't parse URL — using default" };
  }

  const url = new URL(normalized.href);
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const path = url.pathname.toLowerCase();
  const subdomainLabels = getSubdomainLabels(url.hostname);
  const pathSegments = path
    .split("/")
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  if (LIBRARY_HOSTS.has(host)) {
    return {
      mode: "library",
      reason: `${host} hosts package documentation`,
    };
  }

  if (host === "github.com") {
    const githubMode = detectGithubMode(pathSegments);
    if (githubMode) return githubMode;
  }

  if (host.endsWith(".github.io") && pathSegments.length > 0) {
    return {
      mode: "library",
      reason: "GitHub Pages typically hosts library docs",
    };
  }

  const matches: MatchedSignal[] = [];

  for (const label of subdomainLabels) {
    const sig = matchKeyword(label, SUBDOMAIN_SIGNALS);
    if (sig) {
      matches.push({
        mode: sig.signal.mode,
        weight: scaledWeight(sig.signal.weight, sig.confidence),
        reason: `subdomain "${label}" → ${sig.signal.mode === "docs-marker" ? "docs context" : sig.signal.mode}`,
      });
    }
  }

  for (const segment of pathSegments) {
    const sig = matchKeyword(segment, PATH_SIGNALS);
    if (sig) {
      matches.push({
        mode: sig.signal.mode,
        weight: scaledWeight(sig.signal.weight, sig.confidence),
        reason: `path segment "${segment}" → ${sig.signal.mode === "docs-marker" ? "docs context" : sig.signal.mode}`,
      });
    }
    if (VERSION_SEGMENT_RE.test(segment)) {
      matches.push({
        mode: "api",
        weight: 35,
        reason: `version segment "${segment}" suggests API`,
      });
    }
  }

  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";
  for (const file of FILE_SIGNALS) {
    if (file.matcher.test(lastSegment)) {
      matches.push({
        mode: file.mode,
        weight: file.weight,
        reason: file.reason,
      });
    }
  }

  const aggregated = aggregate(matches);
  const docsContext = matches.some((m) => m.mode === "docs-marker");
  const winner = pickWinner(aggregated);

  if (winner && winner.score >= SCORE_THRESHOLD) {
    return { mode: winner.mode, reason: winner.reason };
  }

  if (docsContext) {
    return {
      mode: "api",
      reason: "docs URL with no specific signal — defaulting to API docs",
    };
  }

  if (winner && winner.score > 0) {
    return { mode: winner.mode, reason: winner.reason };
  }

  return { mode: "design", reason: "looks like a product or marketing site" };
}

function detectGithubMode(segments: string[]): ModeDetection | null {
  if (segments.length < 2) return null;
  const isMd = segments[segments.length - 1].endsWith(".md");
  const insideDocs = segments.includes("docs") || segments.includes("doc");
  if (isMd && insideDocs) {
    return { mode: "library", reason: "GitHub markdown doc inside /docs/" };
  }
  if (segments[2] === "tree" || segments[2] === "blob") {
    return { mode: "library", reason: "GitHub repo source — using library mode" };
  }
  return { mode: "library", reason: "GitHub repository — using library mode" };
}

function aggregate(matches: MatchedSignal[]): Map<GenerationMode, AggregatedScore> {
  const scores = new Map<GenerationMode, AggregatedScore>();
  for (const m of matches) {
    if (m.mode === "docs-marker") continue;
    const existing = scores.get(m.mode);
    if (!existing) {
      scores.set(m.mode, { mode: m.mode, score: m.weight, reason: m.reason });
    } else {
      existing.score += m.weight;
      if (m.weight > pickReasonWeight(existing.reason, matches)) {
        existing.reason = m.reason;
      }
    }
  }
  return scores;
}

function pickReasonWeight(reason: string, matches: MatchedSignal[]): number {
  let max = 0;
  for (const m of matches) {
    if (m.reason === reason && m.weight > max) max = m.weight;
  }
  return max;
}

const MODE_PRIORITY: GenerationMode[] = ["api", "library", "generic", "design"];

function pickWinner(
  scores: Map<GenerationMode, AggregatedScore>
): AggregatedScore | null {
  let best: AggregatedScore | null = null;
  for (const mode of MODE_PRIORITY) {
    const candidate = scores.get(mode);
    if (!candidate) continue;
    if (!best || candidate.score > best.score) {
      best = candidate;
    }
  }
  return best;
}

interface KeywordMatch {
  signal: KeywordSignal;
  confidence: number;
}

function matchKeyword(
  segment: string,
  signals: KeywordSignal[]
): KeywordMatch | null {
  const norm = normalizeForFuzzy(segment);
  if (!norm) return null;

  let best: KeywordMatch | null = null;
  for (const sig of signals) {
    const target = normalizeForFuzzy(sig.kw);
    if (!target) continue;

    let confidence = 0;
    if (norm === target) {
      confidence = 1;
    } else if (target.length >= 4 && norm.includes(target)) {
      confidence = 0.85;
    } else if (target.length >= 4 && norm.startsWith(target)) {
      confidence = 0.9;
    } else if (
      norm.length >= FUZZY_MIN_LEN &&
      target.length >= FUZZY_MIN_LEN &&
      levenshtein(norm, target) <= FUZZY_MAX_DISTANCE
    ) {
      confidence = 0.7;
    }

    if (confidence === 0) continue;
    if (!best || confidence > best.confidence) {
      best = { signal: sig, confidence };
    }
  }
  return best;
}

function scaledWeight(weight: number, confidence: number): number {
  return Math.round(weight * confidence);
}

function normalizeForFuzzy(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getSubdomainLabels(host: string): string[] {
  const lower = host.toLowerCase();
  const parts = lower.split(".").filter(Boolean);
  if (parts.length <= 2) return [];
  const sliced = parts.slice(0, parts.length - 2);
  return sliced.filter((p) => p && p !== "www");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j - 1], dp[j]);
      }
      prev = tmp;
    }
  }
  return dp[b.length];
}
