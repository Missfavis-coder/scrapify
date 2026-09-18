import {
  streamSkillBody,
  generateSkillMeta,
  buildSkillWithPackages,
} from "@/lib/server/ai/generate-skill";
import { evaluateSkill } from "@/lib/server/ai/evaluator";
import {
  setSkillMd,
  setSkillQuality,
  updateGenerationStatus,
  upsertArtifacts,
} from "@/lib/server/db/queries/generations";
import { uploadExtractedSnapshot } from "@/lib/server/storage/extracted-blob";
import { buildExtractedSummary } from "@/lib/server/storage/extracted-blob";
import { logEvent, logError, startTimer } from "@/lib/server/logger";
import { classifyError } from "@/lib/server/ai/error-message";
import { ITERATION_COPY } from "@/lib/constants/iteration";
import type { CssTokens, ContentTokens } from "@/lib/types/extraction";
import type {
  ExtractedDataSnapshot,
  GenerationMode,
} from "@/lib/types/generation";

interface IterateInput {
  generationId: string;
  sourceMode: GenerationMode;
  sourceUrl: string;
  sourceHost: string;
  sourceSkillMd: string;
  sourceExtractedData: ExtractedDataSnapshot;
  sourceScreenshotAboveUrl: string | null;
  sourceScreenshotFullUrl: string | null;
  prompt: string;
}

const META_FALLBACK_DESCRIPTION_PREFIX =
  "Use this skill when working with the iterated variant of";

const SCREENSHOT_FETCH_TIMEOUT_MS = 15_000;
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

async function fetchScreenshotBase64(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(SCREENSHOT_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_SCREENSHOT_BYTES) {
      return null;
    }
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

export async function runSkillIteration(input: IterateInput): Promise<void> {
  const totalElapsed = startTimer();

  try {
    await updateGenerationStatus(input.generationId, "extracting");

    const summary = buildExtractedSummary(input.sourceExtractedData);
    const extractedDataUrl = await uploadExtractedSnapshot(
      input.generationId,
      input.sourceExtractedData
    );
    await upsertArtifacts({
      generationId: input.generationId,
      screenshotAbove: input.sourceScreenshotAboveUrl,
      screenshotFull: input.sourceScreenshotFullUrl,
      extractedDataUrl,
      extractedSummary: summary,
    });

    await updateGenerationStatus(input.generationId, "generating");

    const { cssTokens, contentTokens } = snapshotToTokens(
      input.sourceExtractedData
    );
    const addendum = buildIterationAddendum({
      prompt: input.prompt,
      sourceSkillMd: input.sourceSkillMd,
    });

    const useScreenshots =
      input.sourceMode === "design" || input.sourceMode === "motion";
    const [screenshotAboveBase64, screenshotFullBase64] = useScreenshots
      ? await Promise.all([
          fetchScreenshotBase64(input.sourceScreenshotAboveUrl),
          fetchScreenshotBase64(input.sourceScreenshotFullUrl),
        ])
      : [null, null];

    const aiElapsed = startTimer();
    const stream = await streamSkillBody({
      mode: input.sourceMode,
      url: input.sourceUrl,
      pageTitle: contentTokens.metaTitle || input.sourceHost,
      cssTokens,
      contentTokens,
      screenshotAboveBase64,
      screenshotFullBase64,
      systemAddendum: addendum,
    });

    let body = "";
    for await (const chunk of stream.textStream) {
      body += chunk;
    }

    logEvent("iterate.body.done", {
      generationId: input.generationId,
      ms: aiElapsed(),
      chars: body.length,
    });

    const meta = await generateSkillMeta({
      mode: input.sourceMode,
      url: input.sourceUrl,
      pageTitle: contentTokens.metaTitle || input.sourceHost,
      body,
    }).catch(() => ({
      name: `${input.sourceHost.replace(/\./g, "-")}-iterated`.slice(0, 40),
      description:
        `${META_FALLBACK_DESCRIPTION_PREFIX} ${input.sourceHost} with these tweaks: ${input.prompt}`.slice(
          0,
          280
        ),
      slug: `${input.sourceHost.replace(/\./g, "-")}-iterated`.slice(0, 40),
    }));

    const skill = await buildSkillWithPackages({
      mode: input.sourceMode,
      meta,
      body,
    });

    await Promise.all([
      setSkillMd(input.generationId, skill.raw, meta.name, meta.description),
      updateGenerationStatus(input.generationId, "done"),
    ]);

    void runEvaluation({
      generationId: input.generationId,
      skillMd: skill.raw,
      mode: input.sourceMode,
      sourceUrl: input.sourceUrl,
    });

    logEvent("iterate.done", {
      generationId: input.generationId,
      ms: totalElapsed(),
    });
  } catch (error) {
    const classified = classifyError(error);
    logError("iterate.failed", error, {
      generationId: input.generationId,
      ms: totalElapsed(),
      errorCode: classified.code,
    });
    await updateGenerationStatus(
      input.generationId,
      "failed",
      ITERATION_COPY.errorToast,
      { code: classified.code, detail: classified.detail }
    ).catch(() => undefined);
    throw error;
  }
}

interface AddendumInput {
  prompt: string;
  sourceSkillMd: string;
}

function buildIterationAddendum(input: AddendumInput): string {
  const trimmed = input.sourceSkillMd.slice(0, 6000);
  return `${ITERATION_COPY.systemAddendum}

USER ADJUSTMENT:
${input.prompt.trim()}

SOURCE SKILL (verbatim):
${trimmed}`;
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

interface EvalInput {
  generationId: string;
  skillMd: string;
  mode: GenerationMode;
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
    logEvent("iterate.evaluation.done", {
      generationId: input.generationId,
      ms: elapsed(),
      score: evaluation.score,
    });
  } catch (error) {
    logError("iterate.evaluation.failed", error, {
      generationId: input.generationId,
      ms: elapsed(),
    });
  }
}
