import {
  setSkillMd,
  updateGenerationStatus,
  updateSkillMdProgress,
} from "@/lib/server/db/queries/generations";
import {
  streamSkillBody,
  generateSkillMeta,
  buildSkillWithPackages,
} from "@/lib/server/ai/generate-skill";
import { buildFeedbackAddendum } from "@/lib/server/ai/feedback-addendum";
import { LIMITS } from "@/lib/constants/limits";
import { logEvent, logError, startTimer } from "@/lib/server/logger";
import { classifyError, ERROR_CODES } from "@/lib/server/ai/error-message";
import type {
  ExtractedDataSnapshot,
  GenerationMode,
} from "@/lib/types/generation";
import type {
  CssTokens,
  ContentTokens,
} from "@/lib/types/extraction";
import type { RunEvent } from "@/lib/types/run-events";
import { buildFallbackSkillMeta } from "@/lib/server/ai/fallback-meta";
import type { SkillMeta } from "@/lib/server/ai/schemas/skill-meta";

interface RunFromExtractedInput {
  generationId: string;
  mode: GenerationMode;
  url: string;
  host: string;
  pageTitle: string;
  screenshotAbove: string | null;
  screenshotFull: string | null;
  extracted: ExtractedDataSnapshot;
  feedback: string | null;
  signal?: AbortSignal;
}

const META_TRIGGER_CHARS = 1500;
const PROGRESS_FLUSH_MS = 1500;

export async function* runAiOnlyPipeline(
  input: RunFromExtractedInput
): AsyncGenerator<RunEvent, void, unknown> {
  const { generationId, mode, url, host, pageTitle, feedback } = input;
  const wallClockController = new AbortController();
  const wallClockTimer = setTimeout(
    () => wallClockController.abort(),
    LIMITS.pipelineWallClockMs
  );
  const composedSignal = composeSignals(input.signal, wallClockController.signal);
  const totalElapsed = startTimer();

  logEvent("pipeline.improve.start", { generationId, mode });

  try {
    yield { type: "status", status: "extracting" };
    await updateGenerationStatus(generationId, "extracting");

    yield {
      type: "artifacts",
      screenshotAbove: input.screenshotAbove ?? "",
      screenshotFull: input.screenshotFull ?? null,
      colors: input.extracted.colors ?? [],
      fonts: input.extracted.fonts ?? [],
      pageTitle,
      sourceHost: host,
    };

    yield { type: "status", status: "generating" };
    await updateGenerationStatus(generationId, "generating");

    const cssTokens = toCssTokens(input.extracted);
    const contentTokens = toContentTokens(input.extracted, pageTitle);
    const systemAddendum = buildFeedbackAddendum(feedback);

    const aiBodyElapsed = startTimer();
    const result = await streamSkillBody({
      mode,
      url,
      pageTitle,
      cssTokens,
      contentTokens,
      screenshotAboveBase64: null,
      systemAddendum,
    });

    let body = "";
    let metaPromise: Promise<SkillMeta> | null = null;
    let lastFlush = Date.now();

    for await (const chunk of result.textStream) {
      throwIfAborted(composedSignal);
      body += chunk;
      yield { type: "token", delta: chunk };

      if (!metaPromise && body.length >= META_TRIGGER_CHARS) {
        metaPromise = generateSkillMeta({ mode, url, pageTitle, body }).catch(
          (error) => {
            logError("pipeline.improve.meta.failed", error, { generationId });
            return buildFallbackSkillMeta(host, pageTitle, mode);
          }
        );
      }

      if (Date.now() - lastFlush > PROGRESS_FLUSH_MS) {
        void updateSkillMdProgress(generationId, body);
        lastFlush = Date.now();
      }
    }

    logEvent("pipeline.improve.body.done", {
      generationId,
      ms: aiBodyElapsed(),
      chars: body.length,
    });

    const meta =
      (await metaPromise) ??
      (await generateSkillMeta({ mode, url, pageTitle, body }).catch(
        (error) => {
          logError("pipeline.improve.meta.fallback", error, { generationId });
          return buildFallbackSkillMeta(host, pageTitle, mode);
        }
      ));

    const skill = await buildSkillWithPackages({ mode, meta, body });
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
    logEvent("pipeline.improve.done", { generationId, ms: totalElapsed() });
    yield { type: "status", status: "done" };
    yield { type: "done" };
  } catch (error) {
    const aborted = wallClockController.signal.aborted;
    const classified = aborted
      ? {
          message: `Improve timed out after ${Math.round(
            LIMITS.pipelineWallClockMs / 1000
          )}s`,
          code: ERROR_CODES.TIMEOUT,
          detail:
            error instanceof Error
              ? error.stack ?? error.message
              : "wall-clock timeout",
        }
      : classifyError(error);
    logError("pipeline.improve.failed", error, {
      generationId,
      errorCode: classified.code,
    });
    await updateGenerationStatus(generationId, "failed", classified.message, {
      code: classified.code,
      detail: classified.detail,
    });
    yield { type: "error", message: classified.message };
  } finally {
    clearTimeout(wallClockTimer);
  }
}

function toCssTokens(snapshot: ExtractedDataSnapshot): CssTokens {
  return {
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
  };
}

function toContentTokens(
  snapshot: ExtractedDataSnapshot,
  pageTitle: string
): ContentTokens {
  return {
    metaTitle: snapshot.metaTitle ?? pageTitle,
    metaDescription: snapshot.metaDescription ?? "",
    headings: (snapshot.headings ?? []).map((text) => ({ level: 2, text })),
    paragraphs: [],
    codeBlocks: [],
    favicon: snapshot.favicon ?? null,
    ogImage: snapshot.ogImage ?? null,
    twitterImage: snapshot.twitterImage ?? null,
    logo: snapshot.logo ?? null,
    assets: snapshot.assets ?? [],
    motion: snapshot.motion ?? null,
  };
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error("Pipeline aborted");
}

function composeSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}
