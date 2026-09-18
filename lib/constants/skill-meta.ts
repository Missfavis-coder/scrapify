import type { GenerationMode } from "@/lib/types/generation";

export const SKILL_META_LIMITS = {
  descriptionMin: 120,
  descriptionMax: 400,
  nameMin: 3,
  nameMax: 40,
} as const;

export function buildFallbackSkillDescription(
  subject: string,
  mode: GenerationMode
): string {
  const label = subject.trim() || "this source";

  switch (mode) {
    case "design":
      return `Use this skill when building interfaces, landing pages, or components for ${label}. It includes the extracted color palette, typography scale, spacing tokens, and layout patterns from the source site so generated UI matches the brand without guessing.`;
    case "motion":
      return `Use this skill when recreating motion, transitions, or animated UI for ${label}. It captures timing curves, scroll behavior, media usage, and interaction patterns measured from the source site so agents can match the original feel.`;
    case "api":
      return `Use this skill when integrating with ${label}'s API. It summarizes endpoints, authentication, request and response shapes, error handling, and usage conventions drawn from the official documentation.`;
    case "library":
      return `Use this skill when working with the ${label} SDK or framework. It documents installation, core APIs, configuration options, and common usage patterns extracted from the library reference.`;
    case "generic":
      return `Use this skill when working with ${label} documentation. It distills key concepts, terminology, workflows, and reference details so agents can answer questions and implement features accurately.`;
  }
}
