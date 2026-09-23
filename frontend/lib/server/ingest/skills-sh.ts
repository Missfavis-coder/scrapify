import { SKILLS_SH_BASE_URL, SKILLS_SH_SITEMAP_URL } from "@/lib/server/ingest/constants";
import { httpGetText } from "@/lib/server/ingest/http";
import type { SitemapEntry } from "@/lib/types/curated";

const LOC_REGEX = /<loc>([^<]+)<\/loc>/gi;

export async function fetchSitemapEntries(): Promise<SitemapEntry[]> {
  const xml = await httpGetText(SKILLS_SH_SITEMAP_URL);
  const entries: SitemapEntry[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  LOC_REGEX.lastIndex = 0;
  while ((match = LOC_REGEX.exec(xml)) !== null) {
    const loc = match[1].trim();
    if (!loc.startsWith(SKILLS_SH_BASE_URL)) continue;

    let url: URL;
    try {
      url = new URL(loc);
    } catch {
      continue;
    }
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 3) continue;
    const [owner, repo, slug] = segments;
    if (!owner || !repo || !slug) continue;
    const key = `${owner}/${repo}/${slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      source: "skills.sh",
      owner,
      repo,
      slug,
      sourceUrl: loc,
    });
  }
  return entries;
}
