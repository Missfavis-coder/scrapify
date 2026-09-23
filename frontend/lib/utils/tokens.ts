import { parseColorGroups } from "@/lib/utils/color-groups";
import type { GenerationWithArtifacts } from "@/lib/types/generation";
import type { ColorScheme } from "@/lib/types/extraction";

export interface DesignTokens {
  name: string | null;
  description: string | null;
  source: { url: string; host: string };
  scheme: ColorScheme;
  colors: Record<string, string[]> | string[];
  typography: {
    families: string[];
    heading: string | null;
    body: string | null;
    mono: string | null;
    sizes: number[];
    weights: number[];
  };
  radii: string[];
  shadows: string[];
  spacing: string[];
  motion: {
    transitions: string[];
    easings: string[];
    durations: string[];
  };
  meta: {
    favicon: string | null;
    ogImage: string | null;
    twitterImage: string | null;
    logo: string | null;
  };
}

export function buildDesignTokens(generation: GenerationWithArtifacts): DesignTokens {
  const ed = generation.artifacts.extractedData;
  const groups = parseColorGroups(generation.artifacts.skillMd);

  const colors: DesignTokens["colors"] =
    groups.length > 0
      ? Object.fromEntries(
          groups.map((g) => [
            slugify(g.name),
            g.colors.map((c) => c.hex.toUpperCase()),
          ])
        )
      : (ed.colors ?? []);

  return {
    name: generation.artifacts.skillName,
    description: generation.artifacts.skillDescription,
    source: { url: generation.sourceUrl, host: generation.sourceHost },
    scheme: ed.colorScheme ?? "light",
    colors,
    typography: {
      families: ed.fonts ?? [],
      heading: ed.fontRoles?.heading ?? null,
      body: ed.fontRoles?.body ?? null,
      mono: ed.fontRoles?.mono ?? null,
      sizes: ed.fontSizes ?? [],
      weights: ed.fontWeights ?? [],
    },
    radii: ed.borderRadii ?? [],
    shadows: ed.shadows ?? [],
    spacing: ed.spacing ?? [],
    motion: {
      transitions: ed.transitions ?? [],
      easings: ed.easings ?? [],
      durations: ed.durations ?? [],
    },
    meta: {
      favicon: ed.favicon ?? null,
      ogImage: ed.ogImage ?? null,
      twitterImage: ed.twitterImage ?? null,
      logo: ed.logo ?? null,
    },
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
