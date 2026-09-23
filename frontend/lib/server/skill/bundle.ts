import {
  findAccessibleSkillBySlug,
  getGenerationWithArtifacts,
} from "@/lib/server/db/queries/generations";
import { buildDesignTokens } from "@/lib/utils/tokens";
import { buildTokenContract } from "@/lib/utils/token-contract";
import { sha256Hex } from "@/lib/utils/hash";
import { pickFontMap } from "@/lib/utils/font-substitutions";
import { parseSuggestedPackages } from "@/lib/utils/markdown";
import type { SkillBundleResponse } from "@/lib/types/skill-bundle";

export async function buildBundleForSlug(
  slug: string,
  viewerUserId: string | null = null
): Promise<SkillBundleResponse | null> {
  const summary = await findAccessibleSkillBySlug(slug, viewerUserId);
  if (!summary) return null;

  const generation = await getGenerationWithArtifacts(summary.generationId);
  if (!generation) return null;

  const tokens = buildDesignTokens(generation);
  const fontMap = pickFontMap(
    {
      heading: tokens.typography.heading,
      body: tokens.typography.body,
      button: null,
      mono: tokens.typography.mono,
    },
    tokens.typography.families
  );
  const tokensHash = sha256Hex(JSON.stringify(tokens));
  const contract = buildTokenContract(tokens);

  const extracted = generation.artifacts.extractedData;

  return {
    slug,
    version: summary.updatedAt,
    sourceUrl: generation.sourceUrl,
    sourceHost: generation.sourceHost,
    skillMd: summary.skillMd,
    name: summary.name,
    description: summary.description,
    tokens,
    fontMap,
    tokensHash,
    contract,
    screenshots: {
      above: generation.artifacts.screenshotAbove,
      full: generation.artifacts.screenshotFull,
    },
    assets: {
      favicon: extracted.favicon ?? null,
      ogImage: extracted.ogImage ?? null,
      twitterImage: extracted.twitterImage ?? null,
      logo: extracted.logo ?? null,
    },
    suggestedPackages: parseSuggestedPackages(summary.skillMd),
  };
}
