import { extractWithRetry } from "@/lib/server/extractor/extract-with-retry";
import { crawl, shouldCrawlMode } from "@/lib/server/extractor/crawler";
import { uploadScreenshot } from "@/lib/server/storage/r2";
import {
  buildExtractedSummary,
  uploadExtractedSnapshot,
} from "@/lib/server/storage/extracted-blob";
import { captureSourceBaseline } from "@/lib/server/refresh/source-probe";
import {
  uploadPagesSnapshot,
  loadPagesSnapshotById,
} from "@/lib/server/storage/pages-blob";
import {
  setSkillMd,
  setSkillQuality,
  setScreenshotFull,
  updateGenerationStatus,
  upsertArtifacts,
  updateSkillMdProgress,
} from "@/lib/server/db/queries/generations";
import { restoreArtifactsFromLatestVersion } from "@/lib/server/db/queries/generation-versions";
import {
  streamSkillBody,
  generateSkillMeta,
  buildSkillWithPackages,
} from "@/lib/server/ai/generate-skill";
import { evaluateSkill } from "@/lib/server/ai/evaluator";
import { buildFeedbackAddendum } from "@/lib/server/ai/feedback-addendum";
import { buildSkillFile } from "@/lib/utils/markdown";
import { withTimeout } from "@/lib/utils/timeout";
import { LIMITS } from "@/lib/constants/limits";
import { logEvent, logError, startTimer } from "@/lib/server/logger";
import { addDailyBudgetTokens } from "@/lib/server/quota/daily-budget";
import { classifyError, ERROR_CODES } from "@/lib/server/ai/error-message";
import { isProtectionWallError } from "@/lib/server/extractor/protection";
import { estimateTokensFromChars } from "@/lib/server/ai/token-estimate";
import type {
  GenerationMode,
  ExtractedDataSnapshot,
  SourceKind,
} from "@/lib/types/generation";
import { runPipelineFromImage } from "@/lib/server/ai/pipeline-from-image";
import type { ExtractedPage } from "@/lib/types/extraction";
import type { RunEvent } from "@/lib/types/run-events";
import { buildFallbackSkillMeta } from "@/lib/server/ai/fallback-meta";
import type { SkillMeta } from "@/lib/server/ai/schemas/skill-meta";

interface PipelineInput {
  generationId: string;
  url: string;
  mode: GenerationMode;
  signal?: AbortSignal;
  feedback?: string | null;
  imageUrl?: string | null;
  imageMediaType?: string | null;
  sourceLabel?: string | null;
  sourceHost?: string | null;
  sourceKind?: SourceKind | null;
  parentSkillBodies?: string[];
}

const META_TRIGGER_CHARS = 1500;
const PROGRESS_FLUSH_MS = 1500;
const PARTIAL_TRUNCATION_FOOTER =
  "\n\n_(Generation was truncated; refresh to continue.)_\n";

export async function* runGenerationPipeline(
  input: PipelineInput
): AsyncGenerator<RunEvent, void, unknown> {
  if (shouldUseImagePipeline(input)) {
    yield* runPipelineFromImage({
      generationId: input.generationId,
      imageUrl: input.imageUrl ?? input.url,
      imageMediaType: input.imageMediaType ?? "image/png",
      sourceLabel: input.sourceLabel ?? input.url,
      sourceHost: input.sourceHost ?? hostFromUrl(input.url),
      mode: input.mode,
      feedback: input.feedback ?? null,
      signal: input.signal,
      parentSkillBodies: input.parentSkillBodies ?? [],
    });
    return;
  }
  const { generationId, url, mode, signal, feedback } = input;
  const systemAddendum = buildFeedbackAddendum(feedback);
  const wallClockController = new AbortController();
  const wallClockTimer = setTimeout(
    () => wallClockController.abort(),
    LIMITS.pipelineWallClockMs
  );
  const composedSignal = composeSignals(signal, wallClockController.signal);
  const totalElapsed = startTimer();

  logEvent("pipeline.start", { generationId, url, mode });

  let body = "";
  let salvageHost = "";
  let salvageTitle = "";
  let salvageUrl = url;

  try {
    yield { type: "status", status: "extracting" };
    await updateGenerationStatus(generationId, "extracting");

    const cachedPages = await loadPagesSnapshotById(generationId).catch(() => null);

    const extractElapsed = startTimer();
    logEvent("pipeline.extract.start", { generationId, url, hasCachedPages: !!cachedPages });
    const extracted = await extractWithRetry({
      url,
      deep: mode === "motion",
      attemptTimeoutMs:
        mode === "motion"
          ? LIMITS.motionExtractionWallClockMs
          : LIMITS.extractionWallClockMs,
      signal: composedSignal,
    });
    salvageHost = extracted.host;
    salvageTitle = extracted.pageTitle;
    salvageUrl = extracted.finalUrl;
    logEvent("pipeline.extract.done", {
      generationId,
      ms: extractElapsed(),
      finalUrl: extracted.finalUrl,
      aboveBytes: extracted.screenshotAboveBuffer.length,
      fullBytes: extracted.screenshotFullBuffer.length,
      colorCount: extracted.cssTokens.colors.length,
      rootLinks: extracted.linkCandidates.length,
    });
    throwIfAborted(composedSignal);

    const aboveUploadElapsed = startTimer();
    logEvent("pipeline.upload.above.start", { generationId });
    const aboveUrlPromise = withTimeout(
      uploadScreenshot({
        pathname: `screenshots/${generationId}-above.png`,
        buffer: extracted.screenshotAboveBuffer,
        contentType: "image/png",
      }),
      LIMITS.screenshotUploadMs,
      "above-fold screenshot upload"
    );

    const fullUploadElapsed = startTimer();
    logEvent("pipeline.upload.full.start", { generationId });
    const fullUploadPromise = withTimeout(
      uploadScreenshot({
        pathname: `screenshots/${generationId}-full.png`,
        buffer: extracted.screenshotFullBuffer,
        contentType: "image/png",
      }),
      LIMITS.screenshotUploadMs,
      "full-page screenshot upload"
    )
      .then((url) => {
        logEvent("pipeline.upload.full.done", {
          generationId,
          ms: fullUploadElapsed(),
        });
        return url;
      })
      .catch((error) => {
        logError("pipeline.upload.full.failed", error, {
          generationId,
          ms: fullUploadElapsed(),
        });
        return null;
      });

    const aboveUrl = await aboveUrlPromise;
    logEvent("pipeline.upload.above.done", {
      generationId,
      ms: aboveUploadElapsed(),
    });
    throwIfAborted(composedSignal);

    const snapshot: ExtractedDataSnapshot = {
      colors: extracted.cssTokens.colors,
      coreColors: extracted.cssTokens.coreColors,
      primary: extracted.cssTokens.primary,
      fonts: extracted.cssTokens.fonts,
      fontRoles: extracted.cssTokens.fontRoles,
      cursors: extracted.cssTokens.cursors,
      buttons: extracted.cssTokens.buttons,
      fontSizes: extracted.cssTokens.fontSizes,
      fontWeights: extracted.cssTokens.fontWeights,
      borderRadii: extracted.cssTokens.borderRadii,
      shadows: extracted.cssTokens.shadows,
      usesShadows: extracted.cssTokens.usesShadows,
      spacing: extracted.cssTokens.spacing,
      transitions: extracted.cssTokens.transitions,
      easings: extracted.cssTokens.easings,
      durations: extracted.cssTokens.durations,
      colorScheme: extracted.cssTokens.colorScheme,
      headings: extracted.contentTokens.headings.map((h) => h.text),
      codeBlocks: extracted.contentTokens.codeBlocks.length,
      metaTitle: extracted.contentTokens.metaTitle,
      metaDescription: extracted.contentTokens.metaDescription,
      favicon: extracted.contentTokens.favicon,
      ogImage: extracted.contentTokens.ogImage,
      twitterImage: extracted.contentTokens.twitterImage,
      logo: extracted.contentTokens.logo,
      assets: extracted.contentTokens.assets,
      motion: extracted.contentTokens.motion ?? null,
    };

    const extractedDataUrl = await uploadExtractedSnapshot(generationId, snapshot);
    const extractedSummary = buildExtractedSummary(snapshot);
    void upsertArtifacts({
      generationId,
      screenshotAbove: aboveUrl,
      screenshotFull: null,
      extractedDataUrl,
      extractedSummary,
    });

    yield {
      type: "artifacts",
      screenshotAbove: aboveUrl,
      screenshotFull: null,
      colors: extracted.cssTokens.colors,
      fonts: extracted.cssTokens.fonts,
      pageTitle: extracted.pageTitle,
      sourceHost: extracted.host,
    };

    yield { type: "status", status: "generating" };
    await updateGenerationStatus(generationId, "generating");

    let crawledPages: ExtractedPage[] | undefined = cachedPages ?? undefined;
    if (!crawledPages && shouldCrawlMode(mode)) {
      const crawlElapsed = startTimer();
      try {
        const result = await withTimeout(
          crawl({
            rootUrl: extracted.finalUrl,
            mode,
            rootContentTokens: extracted.contentTokens,
            rootLinks: extracted.linkCandidates,
            rootPageTitle: extracted.pageTitle,
          }),
          LIMITS.extractionWallClockMs,
          "documentation crawl"
        );
        crawledPages = result.pages;
        logEvent("pipeline.crawl.done", {
          generationId,
          ms: crawlElapsed(),
          pages: result.pages.length,
          totalChars: result.totalChars,
        });
        if (crawledPages.length > 0) {
          void uploadPagesSnapshot(generationId, crawledPages).catch((error) =>
            logError("pipeline.pages.upload.failed", error, { generationId })
          );
        }
      } catch (error) {
        logError("pipeline.crawl.failed", error, {
          generationId,
          ms: crawlElapsed(),
        });
      }
    } else if (crawledPages) {
      logEvent("pipeline.crawl.cache-hit", {
        generationId,
        pages: crawledPages.length,
      });
    }

    const aiBodyElapsed = startTimer();
    logEvent("pipeline.ai.body.start", {
      generationId,
      mode,
      crawledPages: crawledPages?.length ?? 0,
    });
    const result = await streamSkillBody({
      mode,
      url: extracted.finalUrl,
      pageTitle: extracted.pageTitle,
      cssTokens: extracted.cssTokens,
      contentTokens: extracted.contentTokens,
      screenshotAboveBase64: extracted.screenshotAboveBuffer.toString("base64"),
      screenshotFullBase64: extracted.screenshotFullBuffer.toString("base64"),
      crawledPages,
      systemAddendum,
    });
    logEvent("pipeline.ai.body.model", {
      generationId,
      modelUsed: result.modelUsed,
    });

    let metaPromise: Promise<SkillMeta> | null = null;
    let lastFlush = Date.now();
    let firstTokenLogged = false;

    for await (const chunk of result.textStream) {
      throwIfAborted(composedSignal);
      if (!firstTokenLogged) {
        firstTokenLogged = true;
        logEvent("pipeline.ai.body.first-token", {
          generationId,
          ms: aiBodyElapsed(),
        });
      }
      body += chunk;
      yield { type: "token", delta: chunk };

      if (!metaPromise && body.length >= META_TRIGGER_CHARS) {
        const metaElapsed = startTimer();
        logEvent("pipeline.ai.meta.start", { generationId, trigger: "inline" });
        metaPromise = generateSkillMeta({
          mode,
          url: extracted.finalUrl,
          pageTitle: extracted.pageTitle,
          body,
        })
          .then((meta) => {
            logEvent("pipeline.ai.meta.done", {
              generationId,
              ms: metaElapsed(),
            });
            return meta;
          })
          .catch((error) => {
            logError("pipeline.ai.meta.failed", error, {
              generationId,
              ms: metaElapsed(),
            });
            return buildFallbackSkillMeta(extracted.host, extracted.pageTitle, mode);
          });
      }

      if (Date.now() - lastFlush > PROGRESS_FLUSH_MS) {
        void updateSkillMdProgress(generationId, body);
        lastFlush = Date.now();
      }
    }

    logEvent("pipeline.ai.body.done", {
      generationId,
      ms: aiBodyElapsed(),
      chars: body.length,
    });

    if (body.length < LIMITS.minSkillBodyChars) {
      throw new Error(
        `Model returned an empty or near-empty body (${body.length} chars).`
      );
    }

    void addDailyBudgetTokens(estimateTokensFromChars(body.length)).catch(
      (error) => {
        logError("pipeline.budget.track.failed", error, { generationId });
      }
    );

    const meta =
      (await metaPromise) ??
      (await generateSkillMeta({
        mode,
        url: extracted.finalUrl,
        pageTitle: extracted.pageTitle,
        body,
      }).catch((error) => {
        logError("pipeline.ai.meta.fallback", error, { generationId });
        return buildFallbackSkillMeta(extracted.host, extracted.pageTitle, mode);
      }));

    const skill = await buildSkillWithPackages({ mode, meta, body });

    const [, , fullScreenshotUrl] = await Promise.all([
      setSkillMd(generationId, skill.raw, meta.name, meta.description),
      updateGenerationStatus(generationId, "done"),
      fullUploadPromise,
    ]);

    if (fullScreenshotUrl) {
      await setScreenshotFull(generationId, fullScreenshotUrl);
      yield { type: "screenshotFull", screenshotFull: fullScreenshotUrl };
    }

    yield {
      type: "meta",
      name: meta.name,
      description: meta.description,
      slug: meta.slug,
    };

    void runEvaluationInBackground({
      generationId,
      skillMd: skill.raw,
      mode,
      sourceUrl: extracted.finalUrl,
    });

    void captureSourceBaseline(generationId, extracted.finalUrl).catch(
      (error) => logError("pipeline.source-baseline", error, { generationId })
    );

    logEvent("pipeline.done", { generationId, ms: totalElapsed() });
    yield { type: "status", status: "done" };
    yield { type: "done" };
  } catch (error) {
    const aborted = wallClockController.signal.aborted;
    const classified = aborted
      ? {
          message: `Generation timed out after ${Math.round(
            LIMITS.pipelineWallClockMs / 1000
          )}s`,
          code: ERROR_CODES.TIMEOUT,
          detail:
            error instanceof Error
              ? error.stack ?? error.message
              : "wall-clock timeout",
        }
      : classifyError(error);

    const blockedByProtection = isProtectionWallError(error);

    if (!blockedByProtection && body.length >= LIMITS.partialSalvageMinChars) {
      logEvent("pipeline.partial.salvage", {
        generationId,
        chars: body.length,
        wallClockAborted: aborted,
      });
      try {
        const salvaged = await salvagePartial({
          generationId,
          mode,
          host: salvageHost,
          pageTitle: salvageTitle,
          url: salvageUrl,
          body,
        });
        yield {
          type: "meta",
          name: salvaged.name,
          description: salvaged.description,
          slug: salvaged.slug,
        };
        logEvent("pipeline.done.partial", { generationId, ms: totalElapsed() });
        yield { type: "status", status: "done" };
        yield { type: "done" };
        return;
      } catch (salvageError) {
        logError("pipeline.partial.salvage.failed", salvageError, { generationId });
      }
    }

    const restored = await restoreArtifactsFromLatestVersion(generationId).catch(
      () => null
    );
    if (restored) {
      logEvent("pipeline.refresh.restored", {
        generationId,
        wallClockAborted: aborted,
        errorCode: classified.code,
      });
      await updateGenerationStatus(generationId, "done");
      yield { type: "restored", message: classified.message };
      yield { type: "status", status: "done" };
      yield { type: "done" };
      return;
    }

    logError("pipeline.failed", error, {
      generationId,
      ms: totalElapsed(),
      wallClockAborted: aborted,
      bodyChars: body.length,
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

interface SalvageInput {
  generationId: string;
  mode: GenerationMode;
  host: string;
  pageTitle: string;
  url: string;
  body: string;
}

async function salvagePartial(input: SalvageInput): Promise<SkillMeta> {
  const meta = await generateSkillMeta({
    mode: input.mode,
    url: input.url,
    pageTitle: input.pageTitle,
    body: input.body,
  }).catch(() => buildFallbackSkillMeta(input.host, input.pageTitle, input.mode));

  const finalBody = `${input.body.trimEnd()}${PARTIAL_TRUNCATION_FOOTER}`;
  const skill = buildSkillFile(meta, finalBody);
  await Promise.all([
    setSkillMd(input.generationId, skill.raw, meta.name, meta.description),
    updateGenerationStatus(input.generationId, "done"),
  ]);
  return meta;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Pipeline aborted");
  }
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

interface EvalInput {
  generationId: string;
  skillMd: string;
  mode: GenerationMode;
  sourceUrl: string;
}

async function runEvaluationInBackground(input: EvalInput): Promise<void> {
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
    logEvent("pipeline.evaluation.done", {
      generationId: input.generationId,
      ms: elapsed(),
      score: evaluation.score,
    });
  } catch (error) {
    logError("pipeline.evaluation.failed", error, {
      generationId: input.generationId,
      ms: elapsed(),
    });
  }
}

const IMAGE_SOURCE_KINDS = new Set<SourceKind>([
  "image",
  "dribbble",
  "pinterest",
  "figma",
  "merge",
]);

function shouldUseImagePipeline(input: PipelineInput): boolean {
  if (input.imageUrl) return true;
  if (input.sourceKind && IMAGE_SOURCE_KINDS.has(input.sourceKind)) return true;
  return false;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
