import {
  buildFallbackSkillDescription,
  SKILL_META_LIMITS,
} from "@/lib/constants/skill-meta";
import type { SkillMeta } from "@/lib/server/ai/schemas/skill-meta";
import type { GenerationMode } from "@/lib/types/generation";

export function buildFallbackSkillMeta(
  host: string,
  title: string,
  mode: GenerationMode
): SkillMeta {
  const slug = hostToSlug(host);
  const fallbackName = `${slug}-${mode}`.slice(0, SKILL_META_LIMITS.nameMax);
  const subject = title.trim() || host.replace(/^www\./, "");

  return {
    name: fallbackName,
    slug: fallbackName,
    description: buildFallbackSkillDescription(subject, mode).slice(
      0,
      SKILL_META_LIMITS.descriptionMax
    ),
  };
}

function hostToSlug(host: string): string {
  const cleaned = host
    .replace(/^www\./, "")
    .replace(/[^a-z0-9.]/gi, "")
    .toLowerCase();
  const labels = cleaned.split(".").filter(Boolean);
  if (labels.length <= 1) return labels[0] ?? "skill";
  return labels.slice(0, labels.length - 1).join("-");
}
