import { z } from "zod";

export const SkillEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string().min(3).max(280)).max(8),
  gaps: z.array(z.string().min(3).max(280)).max(10),
  missingSections: z.array(z.string().min(2).max(80)).max(10),
});

export type SkillEvaluation = z.infer<typeof SkillEvaluationSchema>;

export const SkillEvaluationGenerationSchema = z.object({
  score: z.number(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  missingSections: z.array(z.string()),
});

export type SkillEvaluationGeneration = z.infer<
  typeof SkillEvaluationGenerationSchema
>;

function clampList(
  values: string[],
  maxItems: number,
  minLen: number,
  maxLen: number
): string[] {
  return values
    .map((value) => value.trim().slice(0, maxLen))
    .filter((value) => value.length >= minLen)
    .slice(0, maxItems);
}

export function sanitizeSkillEvaluation(
  raw: SkillEvaluationGeneration
): SkillEvaluation {
  const score = Math.max(0, Math.min(100, Math.round(raw.score)));
  return {
    score,
    strengths: clampList(raw.strengths, 8, 3, 280),
    gaps: clampList(raw.gaps, 10, 3, 280),
    missingSections: clampList(raw.missingSections, 10, 2, 80),
  };
}
