import {
  SkillEvaluationGenerationSchema,
  sanitizeSkillEvaluation,
  type SkillEvaluation,
  type SkillEvaluationGeneration,
} from "@/lib/server/ai/schemas/skill-evaluation";
import { getEvaluationModelChain } from "@/lib/server/ai/gemini";
import { generateObjectWithChainDetailed } from "@/lib/server/ai/fallback";
import { LIMITS } from "@/lib/constants/limits";
import { logEvent, logError, startTimer } from "@/lib/server/logger";
import type { GenerationMode } from "@/lib/types/generation";

interface EvaluateInput {
  skillMd: string;
  mode: GenerationMode;
  sourceUrl: string;
}

export interface EvaluateResult {
  evaluation: SkillEvaluation;
  modelUsed: string;
}

const SYSTEM_PROMPT = `You are a strict reviewer of agent skill documents. You receive:
- A skill.md body
- A "mode" (api | library | design | generic)
- A source URL the skill was generated from
- A synthetic agent task that an agent must accomplish using ONLY this skill

Judge whether the skill contains enough information for the agent to confidently complete the task without consulting other documentation.

Score 0-100 (higher is better) where:
- 90+ = ready to ship; agent can complete the task
- 70-89 = usable but missing detail in 1-3 areas
- 50-69 = significant gaps; agent will need to guess
- <50 = not usable for the task

Return:
- score
- strengths: short bullet list of what the skill does well
- gaps: specific missing facts the agent would need (e.g. "no example of authenticated POST request body shape")
- missingSections: standard skill sections that are absent (e.g. "Authentication", "Error handling")

Be specific. Cite missing endpoints, parameter names, error codes, or component specs by name. Do NOT fabricate.`;

export async function evaluateSkill(
  input: EvaluateInput
): Promise<EvaluateResult> {
  const elapsed = startTimer();
  const task = buildSyntheticTask(input.mode, input.sourceUrl);

  try {
    const { value, modelUsed } =
      await generateObjectWithChainDetailed<SkillEvaluationGeneration>(
        getEvaluationModelChain(),
        {
      schema: SkillEvaluationGenerationSchema,
      system: SYSTEM_PROMPT,
      prompt: `Mode: ${input.mode}
Source URL: ${input.sourceUrl}

Synthetic task for the agent:
${task}

Skill body to evaluate:
---
${input.skillMd.slice(0, 24_000)}
---

Now produce the evaluation object.`,
      timeoutMs: LIMITS.evaluationTimeoutMs,
      }
    );
    const evaluation = sanitizeSkillEvaluation(value);
    logEvent("ai.evaluator.done", {
      ms: elapsed(),
      score: evaluation.score,
      gaps: evaluation.gaps.length,
      model: modelUsed,
    });
    return { evaluation, modelUsed };
  } catch (error) {
    logError("ai.evaluator.failed", error, { ms: elapsed() });
    throw error;
  }
}

function buildSyntheticTask(mode: GenerationMode, sourceUrl: string): string {
  switch (mode) {
    case "api":
      return `An autonomous agent must integrate this API end-to-end: authenticate, charge a customer $10, handle the success and failure responses, and verify the charge via webhook or polling. Determine whether the skill provides every endpoint, parameter, header, error code, and code sample needed to do this without consulting ${sourceUrl}.`;
    case "library":
      return `An autonomous agent must install this library, set up the minimum required configuration, build a non-trivial example feature using its core API, and handle one common failure mode. Determine whether the skill explains installation, primary exports/classes, required setup, and at least one realistic usage pattern.`;
    case "design":
      return `An autonomous agent must reproduce a landing page in this brand's visual style: colors, typography hierarchy, button states, card styling, layout, and responsive behavior. Determine whether the skill provides exact hex colors, font names with sizes/weights, component specs (padding, border-radius, hover/active states), and a spacing scale.`;
    case "motion":
      return `An autonomous agent must rebuild this animation-heavy experience: the scroll-driven reveals, motion timing and easing, any WebGL/canvas or video layer, and the media assets. Determine whether the skill names the animation stack/libraries, the scroll system, the reveal choreography with concrete durations and easings, the WebGL/3D usage, and a media inventory — enough to reproduce the experience without visiting ${sourceUrl}.`;
    case "generic":
    default:
      return `An autonomous agent must apply the conventions described by this document to a real task in the same domain. Determine whether the skill captures the source's primary structure, terminology, and the actionable steps an agent would need.`;
  }
}
