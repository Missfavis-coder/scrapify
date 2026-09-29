export interface ColorEntry {
  hex: string;
  label: string | null;
  description: string | null;
}

export interface ColorGroup {
  name: string;
  colors: ColorEntry[];
}

const COLOR_SECTION_RE =
  /##\s*(?:\d+\.?\s*)?Color(?:s|\s+Palette)[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i;

const HEX_RE = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;

export function parseColorGroups(skillMd: string | null | undefined): ColorGroup[] {
  if (!skillMd) return [];

  const tokenGroups = parseTokenColors(skillMd);
  if (tokenGroups.length > 0) return tokenGroups;

  const sectionMatch = skillMd.match(COLOR_SECTION_RE);
  if (!sectionMatch) return [];

  const sectionContent = sectionMatch[1];
  const groups: ColorGroup[] = [];

  const groupBlocks = [
    ...sectionContent.matchAll(/^(?:###|####)\s+([^\n]+)\n([\s\S]*?)(?=\n#{3,4}\s|$)/gm),
  ];

  for (const block of groupBlocks) {
    const groupName = block[1].trim();
    const body = block[2];
    const colors = extractColorsFromBlock(body);
    if (colors.length > 0) {
      groups.push({ name: groupName, colors });
    }
  }

  if (groups.length === 0) {
    const colors = extractColorsFromBlock(sectionContent);
    if (colors.length > 0) {
      groups.push({ name: "Palette", colors });
    }
  }

  return dedupeGroups(groups);
}

const TOKEN_BLOCK_RE = /^colors:[ \t]*\r?\n([\s\S]*?)(?=^[a-z][a-z0-9_-]*:[ \t]*\r?$|^[a-z][a-z0-9_-]*:[ \t]*\{|^```)/im;
const TOKEN_LINE_RE = /^[ \t]{2,}([a-z][a-z0-9_-]*)[ \t]*:[ \t]*"?(#[0-9a-fA-F]{3,8})"?[ \t]*(?:#[ \t]*(.*?))?\s*$/;

const GROUP_ORDER = [
  "Primary",
  "Text",
  "Surfaces",
  "Borders",
  "Links",
  "Status",
  "Accents",
] as const;

function parseTokenColors(skillMd: string): ColorGroup[] {
  const blockMatch = skillMd.match(TOKEN_BLOCK_RE);
  if (!blockMatch) return [];

  const buckets = new Map<string, ColorEntry[]>();
  const seenPerBucket = new Map<string, Set<string>>();

  for (const line of blockMatch[1].split("\n")) {
    const lineMatch = line.match(TOKEN_LINE_RE);
    if (!lineMatch) continue;

    const key = lineMatch[1];
    const hex = normalizeHex(lineMatch[2]);
    if (!hex) continue;

    const description = cleanDescription(lineMatch[3]);
    const bucket = bucketForToken(key);

    if (!seenPerBucket.has(bucket)) seenPerBucket.set(bucket, new Set());
    const seen = seenPerBucket.get(bucket)!;
    if (seen.has(hex)) continue;
    seen.add(hex);

    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push({ hex, label: key, description });
  }

  const ordered: ColorGroup[] = [];
  for (const name of GROUP_ORDER) {
    const colors = buckets.get(name);
    if (colors && colors.length > 0) ordered.push({ name, colors });
  }
  return ordered;
}

function bucketForToken(key: string): string {
  if (key === "on-primary" || key.startsWith("primary")) return "Primary";
  if (key === "on-ink" || key.startsWith("ink")) return "Text";
  if (/^(canvas|paper|cloud|surface|bg|background|fill)/.test(key)) return "Surfaces";
  if (/^(hairline|border|divider|stroke|outline|rule)/.test(key)) return "Borders";
  if (key.startsWith("link")) return "Links";
  if (/^(success|warning|error|info|danger|caution|positive|negative)/.test(key)) return "Status";
  return "Accents";
}

function cleanDescription(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/[.,;:\s]+$/, "");
  return trimmed.length > 0 ? trimmed : null;
}

function extractColorsFromBlock(text: string): ColorEntry[] {
  const seen = new Set<string>();
  const result: ColorEntry[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const hexMatches = [...line.matchAll(HEX_RE)];
    if (hexMatches.length === 0) continue;
    const hex = normalizeHex(hexMatches[0][0]);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);

    const label = extractLabel(line);
    result.push({ hex, label, description: null });
  }

  return result;
}

function extractLabel(line: string): string | null {
  const stripped = line.replace(/^[*\s\-]+/, "");
  const boldMatch = stripped.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) return boldMatch[1].trim().replace(/[:.]+$/, "");

  const beforeColon = stripped.split(/[—–\-:`]/)[0]?.trim();
  if (beforeColon && beforeColon.length > 0 && beforeColon.length < 60) {
    return beforeColon.replace(/^["']|["']$/g, "");
  }

  return null;
}

function normalizeHex(raw: string): string | null {
  const cleaned = raw.replace("#", "").toLowerCase();
  if (cleaned.length === 3) {
    return `#${cleaned
      .split("")
      .map((c) => c + c)
      .join("")}`;
  }
  if (cleaned.length === 6) return `#${cleaned}`;
  if (cleaned.length === 8) return `#${cleaned.slice(0, 6)}`;
  return null;
}

function dedupeGroups(groups: ColorGroup[]): ColorGroup[] {
  const seen = new Set<string>();
  const result: ColorGroup[] = [];

  for (const group of groups) {
    const filtered = group.colors.filter((color) => {
      if (seen.has(color.hex)) return false;
      seen.add(color.hex);
      return true;
    });
    if (filtered.length > 0) result.push({ name: group.name, colors: filtered });
  }

  return result;
}
