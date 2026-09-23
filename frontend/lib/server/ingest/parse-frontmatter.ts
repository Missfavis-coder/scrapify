import type { ParsedFrontmatter } from "@/lib/types/curated";

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(md: string): { frontmatter: ParsedFrontmatter; body: string } {
  const match = md.match(FRONTMATTER_REGEX);
  if (!match) {
    return {
      frontmatter: { raw: {} },
      body: md,
    };
  }
  const block = match[1];
  const raw: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key) continue;
    raw[key] = value;
  }
  return {
    frontmatter: {
      name: raw.name,
      description: raw.description,
      homepage: raw.homepage ?? raw.url ?? raw.docs ?? raw.documentation,
      repository: raw.repository ?? raw.repo,
      license: raw.license,
      raw,
    },
    body: md.slice(match[0].length),
  };
}
