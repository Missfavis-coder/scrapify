import { SKILL_META_LIMITS } from "@/lib/constants/skill-meta";
import type { GenerationMode } from "@/lib/types/generation";
import { DESIGN_SYSTEM_PROMPT } from "@/lib/server/ai/prompts/design";
import { MOTION_SYSTEM_PROMPT } from "@/lib/server/ai/prompts/motion";
import { API_DOCS_SYSTEM_PROMPT } from "@/lib/server/ai/prompts/api-docs";
import { LIBRARY_SYSTEM_PROMPT } from "@/lib/server/ai/prompts/library";
import { GENERIC_SYSTEM_PROMPT } from "@/lib/server/ai/prompts/generic";

export function getSystemPromptForMode(mode: GenerationMode): string {
  switch (mode) {
    case "design":
      return DESIGN_SYSTEM_PROMPT;
    case "motion":
      return MOTION_SYSTEM_PROMPT;
    case "api":
      return API_DOCS_SYSTEM_PROMPT;
    case "library":
      return LIBRARY_SYSTEM_PROMPT;
    case "generic":
      return GENERIC_SYSTEM_PROMPT;
  }
}

export const META_SYSTEM_PROMPT = `You produce metadata for an agent skill file. Given a source URL, page title, and the body content of a skill, produce:
- name: short kebab-case identifier (3–40 chars, [a-z0-9-])
- description: 2–3 sentences (${SKILL_META_LIMITS.descriptionMin}–${SKILL_META_LIMITS.descriptionMax} chars) starting with "Use this skill when..." that explains what the skill covers and when an agent should load it — mention concrete details like colors, typography, APIs, or patterns when relevant
- slug: same constraints as name; usually equal to name

Rules for name/slug:
- Use the BRAND, not the domain. Drop TLDs (no "-com", "-org", "-io", "-dev", "-app" suffixes).
- Be precise about the subject. Good: "paystack-payments", "stripe-design", "tanstack-query", "linear-api". Bad: "paystack-com", "stripe-com-design".
- Lowercase only, kebab-case, no spaces, no underscores.`;
