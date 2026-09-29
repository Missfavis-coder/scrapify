import type { DesignTokens } from "@/lib/utils/tokens";
import type { SuggestedPackage } from "@/lib/types/packages";

export interface SkillBundleFontMap {
  primary: string;
  body: string;
}

export interface TokenContract {
  tokensJson: string;
  cssVars: string;
  tailwindPreset: string;
}

export interface SkillBundleScreenshots {
  above: string | null;
  full: string | null;
}

export interface SkillBundleAssets {
  favicon: string | null;
  ogImage: string | null;
  twitterImage: string | null;
  logo: string | null;
}

export interface SkillBundleResponse {
  slug: string;
  version: string;
  sourceUrl: string;
  sourceHost: string;
  skillMd: string;
  name: string;
  description: string | null;
  tokens: DesignTokens;
  fontMap: SkillBundleFontMap;
  tokensHash: string;
  contract: TokenContract;
  screenshots: SkillBundleScreenshots;
  assets: SkillBundleAssets;
  suggestedPackages: SuggestedPackage[];
}
