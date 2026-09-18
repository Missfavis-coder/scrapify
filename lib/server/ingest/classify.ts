import { HOSTS_TO_IGNORE_AS_CANONICAL } from "@/lib/server/ingest/constants";
import { parseFrontmatter } from "@/lib/server/ingest/parse-frontmatter";
import type { GenerationMode } from "@/lib/types/generation";
import type { Classification, CuratedKind, SitemapEntry } from "@/lib/types/curated";

const URL_REGEX = /https?:\/\/[^\s)>"'`\]]+/g;

const API_HINT_KEYWORDS = ["api", "rest", "endpoint", "graphql", "openapi", "webhook", "sdk reference"];
const LIBRARY_HINT_KEYWORDS = [
  "library",
  "framework",
  "package",
  "ORM",
  "orm",
  "sdk",
  "toolkit",
  "runtime",
  "compiler",
];
const DESIGN_HINT_KEYWORDS = [
  "design",
  "ui",
  "interface",
  "frontend",
  "visual",
  "aesthetic",
  "layout",
  "typography",
  "ux",
];
const METHODOLOGY_HINT_KEYWORDS = [
  "methodology",
  "best practices",
  "guidelines",
  "principles",
  "philosophy",
  "thinking",
  "approach",
  "process",
];
const TOOLING_HINT_KEYWORDS = ["cli", "command", "tool", "script", "generator", "scaffold"];

export function classifySkill(entry: SitemapEntry, md: string): Classification {
  const { frontmatter, body } = parseFrontmatter(md);
  const name = frontmatter.name?.trim() || entry.slug;
  const description = frontmatter.description?.trim() ?? null;

  const canonicalUrl = pickCanonicalUrl(entry, frontmatter.homepage, body);
  const canonicalHost = canonicalUrl ? safeHost(canonicalUrl) : null;

  const kind = inferKind({
    description,
    body,
    canonicalUrl,
    slug: entry.slug,
  });

  const mode = inferMode({
    name,
    description,
    body,
    kind,
  });

  const matchUrls: Classification["matchUrls"] = [];
  if (canonicalHost) {
    matchUrls.push({ host: canonicalHost, pathPrefix: "", matchType: "domain" });
  }

  return {
    name,
    description,
    kind,
    mode,
    canonicalUrl,
    canonicalHost,
    matchUrls,
  };
}

function pickCanonicalUrl(
  entry: SitemapEntry,
  homepage: string | undefined,
  body: string
): string | null {
  if (homepage) {
    const fromMeta = normalizeUrl(homepage);
    if (fromMeta && !isIgnoredHost(fromMeta) && isPlausibleHost(safeHost(fromMeta))) {
      return fromMeta;
    }
  }
  const counts = new Map<string, { url: string; count: number }>();
  const matches = body.match(URL_REGEX) ?? [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[).,;:!?]+$/, "");
    const url = normalizeUrl(cleaned);
    if (!url) continue;
    if (isIgnoredHost(url)) continue;
    const host = safeHost(url);
    if (!host || !isPlausibleHost(host)) continue;
    const existing = counts.get(host);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(host, { url: rootUrl(url), count: 1 });
    }
  }
  if (counts.size === 0) return null;
  let best: { url: string; count: number } | null = null;
  for (const value of counts.values()) {
    if (!best || value.count > best.count) best = value;
  }
  return best?.url ?? null;
}

const FILE_EXTENSION_HOSTS = /\.(?:jpg|jpeg|png|gif|svg|webp|pdf|zip|tar|gz|md|json|yml|yaml|html|js|ts|tsx|jsx)$/i;

function isPlausibleHost(host: string | null): boolean {
  if (!host) return false;
  if (host === "localhost") return false;
  if (!host.includes(".")) return false;
  if (FILE_EXTENSION_HOSTS.test(host)) return false;
  if (host.startsWith("127.") || host.startsWith("0.0.0.0")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;
  if (host.length > 253) return false;
  return true;
}

function normalizeUrl(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function rootUrl(input: string): string {
  try {
    const u = new URL(input);
    return `${u.protocol}//${u.hostname}`;
  } catch {
    return input;
  }
}

function safeHost(input: string): string | null {
  try {
    return new URL(input).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function isIgnoredHost(input: string): boolean {
  const host = safeHost(input);
  if (!host) return true;
  return HOSTS_TO_IGNORE_AS_CANONICAL.has(host);
}

interface KindInput {
  description: string | null;
  body: string;
  canonicalUrl: string | null;
  slug: string;
}

function inferKind(input: KindInput): CuratedKind {
  const text = `${input.description ?? ""} ${input.slug} ${input.body.slice(0, 800)}`.toLowerCase();
  const hasCanonical = !!input.canonicalUrl;
  const methodologyHits = countHits(text, METHODOLOGY_HINT_KEYWORDS);
  const toolingHits = countHits(text, TOOLING_HINT_KEYWORDS);

  if (!hasCanonical) {
    if (methodologyHits >= 1) return "methodology";
    return "methodology";
  }
  if (toolingHits >= 2) return "tooling";
  return "docs";
}

interface ModeInput {
  name: string;
  description: string | null;
  body: string;
  kind: CuratedKind;
}

function inferMode(input: ModeInput): GenerationMode | null {
  const text = `${input.name} ${input.description ?? ""} ${input.body.slice(0, 1200)}`.toLowerCase();
  const apiHits = countHits(text, API_HINT_KEYWORDS);
  const libraryHits = countHits(text, LIBRARY_HINT_KEYWORDS);
  const designHits = countHits(text, DESIGN_HINT_KEYWORDS);

  if (input.kind === "methodology" && designHits >= 2) return "design";
  if (input.kind === "methodology") return "generic";

  if (apiHits >= 2 && apiHits > libraryHits) return "api";
  if (libraryHits >= 2 && libraryHits >= apiHits) return "library";
  if (designHits >= 2) return "design";
  return "generic";
}

function countHits(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    const lower = kw.toLowerCase();
    if (text.includes(lower)) count += 1;
  }
  return count;
}
