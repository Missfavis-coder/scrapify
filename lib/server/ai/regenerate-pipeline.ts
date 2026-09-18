import {
  streamSkillBody,
  generateSkillMeta,
  buildSkillWithPackages,
} from "@/lib/server/ai/generate-skill";
import { evaluateSkill } from "@/lib/server/ai/evaluator";
import {
  getArtifactsForRegen,
  setSkillMd,
  setSkillQuality,
  clearSkillQuality,
  updateGenerationStatus,
} from "@/lib/server/db/queries/generations";
import { logEvent, logError, startTimer } from "@/lib/server/logger";
import { classifyError } from "@/lib/server/ai/error-message";
import { buildFallbackSkillMeta } from "@/lib/server/ai/fallback-meta";
import type { RunEvent } from "@/lib/types/run-events";
import type { CssTokens, ContentTokens } from "@/lib/types/extraction";
import type { ExtractedDataSnapshot } from "@/lib/types/generation";

interface RegenerateInput {
  generationId: string;
  focus?: string;
  addressGaps?: boolean;
  signal?: AbortSignal;
}

export async function* runRegeneratePipeline(
  input: RegenerateInput
): AsyncGenerator<RunEvent, void, unknown> {
  const { generationId, focus, addressGaps, signal } = input;
  const totalElapsed = startTimer();

  logEvent("regenerate.start", { generationId, focus, addressGaps });

  try {
    const ctx = await getArtifactsForRegen(generationId);
    if (!ctx) {
      yield { type: "error", message: "Generation not found" };
      return;
    }

    const previousQuality = await loadPreviousQuality(generationId);
    await clearSkillQuality(generationId);
    await updateGenerationStatus(generationId, "generating");
    yield { type: "status", status: "generating" };

    const { cssTokens, contentTokens } = snapshotToTokens(ctx.extractedData);
    const addendum = buildAddendum({
      focus,
      addressGaps: addressGaps ?? false,
      previousGaps: previousQuality?.gaps ?? [],
    });

    const aiElapsed = startTimer();
    const result = await streamSkillBody({
      mode: ctx.mode,
      url: ctx.sourceUrl,
      pageTitle: ctx.pageTitle,
      cssTokens,
      contentTokens,
      screenshotAboveBase64: null,
      systemAddendum: addendum,
    });
    logEvent("regenerate.body.model", {
      generationId,
      modelUsed: result.modelUsed,
    });

    let body = "";
    for await (const chunk of result.textStream) {
      if (signal?.aborted) throw new Error("Aborted");
      body += chunk;
      yield { type: "token", delta: chunk };
    }

    logEvent("regenerate.body.done", {
      generationId,
      ms: aiElapsed(),
      chars: body.length,
    });

    const meta = await generateSkillMeta({
      mode: ctx.mode,
      url: ctx.sourceUrl,
      pageTitle: ctx.pageTitle,
      body,
    }).catch(() =>
      buildFallbackSkillMeta(ctx.sourceHost, ctx.pageTitle, ctx.mode)
    );

    const skill = await buildSkillWithPackages({ mode: ctx.mode, meta, body });

    await Promise.all([
      setSkillMd(generationId, skill.raw, meta.name, meta.description),
      updateGenerationStatus(generationId, "done"),
    ]);

    yield {
      type: "meta",
      name: meta.name,
      description: meta.description,
      slug: meta.slug,
    };

    void runEvaluation({
      generationId,
      skillMd: skill.raw,
      mode: ctx.mode,
      sourceUrl: ctx.sourceUrl,
    });

    logEvent("regenerate.done", { generationId, ms: totalElapsed() });
    yield { type: "status", status: "done" };
    yield { type: "done" };
  } catch (error) {
    const classified = classifyError(error);
    logError("regenerate.failed", error, {
      generationId,
      ms: totalElapsed(),
      errorCode: classified.code,
    });
    await updateGenerationStatus(generationId, "failed", classified.message, {
      code: classified.code,
      detail: classified.detail,
    }).catch(() => undefined);
    yield { type: "error", message: classified.message };
  }
}

interface AddendumInput {
  focus?: string;
  addressGaps: boolean;
  previousGaps: string[];
}

function buildAddendum(input: AddendumInput): string | undefined {
  const parts: string[] = [];
  if (input.focus && input.focus.trim().length > 0) {
    parts.push(
      `REGENERATION FOCUS: ${input.focus.trim()}\nWhen rewriting the skill, prioritize this focus area without omitting required sections.`
    );
  }
  if (input.addressGaps && input.previousGaps.length > 0) {
    const list = input.previousGaps.map((g) => `- ${g}`).join("\n");
    parts.push(
      `ADDRESS THESE PREVIOUSLY-IDENTIFIED GAPS in the new version:\n${list}`
    );
  }
  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

async function loadPreviousQuality(
  generationId: string
): Promise<{ gaps: string[] } | null> {
  const { getGenerationWithArtifacts } = await import(
    "@/lib/server/db/queries/generations"
  );
  const row = await getGenerationWithArtifacts(generationId);
  if (!row?.artifacts.quality) return null;
  return { gaps: row.artifacts.quality.evaluation.gaps };
}

interface EvalInput {
  generationId: string;
  skillMd: string;
  mode: import("@/lib/types/generation").GenerationMode;
  sourceUrl: string;
}

async function runEvaluation(input: EvalInput): Promise<void> {
  const elapsed = startTimer();
  try {
    const { evaluation, modelUsed } = await evaluateSkill({
      skillMd: input.skillMd,
      mode: input.mode,
      sourceUrl: input.sourceUrl,
    });
    await setSkillQuality(input.generationId, {
      evaluation,
      evaluatedAt: new Date().toISOString(),
      modelUsed,
    });
    logEvent("regenerate.evaluation.done", {
      generationId: input.generationId,
      ms: elapsed(),
      score: evaluation.score,
    });
  } catch (error) {
    logError("regenerate.evaluation.failed", error, {
      generationId: input.generationId,
      ms: elapsed(),
    });
  }
}

function snapshotToTokens(snapshot: ExtractedDataSnapshot): {
  cssTokens: CssTokens;
  contentTokens: ContentTokens;
} {
  return {
    cssTokens: {
      colors: snapshot.colors ?? [],
      coreColors: snapshot.coreColors ?? [],
      primary: snapshot.primary ?? null,
      fonts: snapshot.fonts ?? [],
      fontRoles: snapshot.fontRoles ?? {
        heading: null,
        body: null,
        button: null,
        mono: null,
      },
      cursors: snapshot.cursors ?? { interactive: "pointer", custom: null },
      buttons: snapshot.buttons ?? { primary: null, secondary: null, link: null },
      fontSizes: snapshot.fontSizes ?? [],
      fontWeights: snapshot.fontWeights ?? [],
      borderRadii: snapshot.borderRadii ?? [],
      shadows: snapshot.shadows ?? [],
      usesShadows: snapshot.usesShadows ?? false,
      spacing: snapshot.spacing ?? [],
      transitions: snapshot.transitions ?? [],
      easings: snapshot.easings ?? [],
      durations: snapshot.durations ?? [],
      colorScheme: snapshot.colorScheme ?? "light",
    },
    contentTokens: {
      metaTitle: snapshot.metaTitle ?? "",
      metaDescription: snapshot.metaDescription ?? "",
      headings: (snapshot.headings ?? []).map((text) => ({ level: 2, text })),
      codeBlocks: [],
      paragraphs: [],
      favicon: snapshot.favicon ?? null,
      ogImage: snapshot.ogImage ?? null,
      twitterImage: snapshot.twitterImage ?? null,
      logo: snapshot.logo ?? null,
      assets: snapshot.assets ?? [],
      motion: snapshot.motion ?? null,
    },
  };
}

