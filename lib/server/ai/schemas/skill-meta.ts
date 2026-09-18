import { z } from "zod";
import { SKILL_META_LIMITS } from "@/lib/constants/skill-meta";

export const SkillMetaSchema = z.object({
  name: z
    .string()
    .min(SKILL_META_LIMITS.nameMin)
    .max(SKILL_META_LIMITS.nameMax)
    .regex(/^[a-z0-9-]+$/, "kebab-case lowercase only"),
  description: z
    .string()
    .min(SKILL_META_LIMITS.descriptionMin)
    .max(SKILL_META_LIMITS.descriptionMax),
  slug: z
    .string()
    .min(SKILL_META_LIMITS.nameMin)
    .max(SKILL_META_LIMITS.nameMax)
    .regex(/^[a-z0-9-]+$/),
});

export type SkillMeta = z.infer<typeof SkillMetaSchema>;

export const SkillMetaGenerationSchema = z.object({
  name: z.string(),
  description: z.string(),
  slug: z.string(),
});

export type SkillMetaGeneration = z.infer<typeof SkillMetaGenerationSchema>;

function toKebab(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SKILL_META_LIMITS.nameMax)
    .replace(/-+$/g, "");
}

export function sanitizeSkillMeta(raw: SkillMetaGeneration): SkillMeta {
  const name = toKebab(raw.name) || toKebab(raw.slug) || "skill";
  const slug = toKebab(raw.slug) || name;
  const description = raw.description
    .trim()
    .slice(0, SKILL_META_LIMITS.descriptionMax);
  return { name, slug, description };
}
