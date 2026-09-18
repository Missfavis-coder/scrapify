import { generateObject } from "ai";
import {
  setSkillMd,
  updateGenerationStatus,
  updateSkillMdProgress,
  upsertArtifacts,
} from "@/lib/server/db/queries/generations";
import {
  generateSkillMeta,
  buildSkillWithPackages,
} from "@/lib/server/ai/generate-skill";
import {
  streamTextWithChain,
} from "@/lib/server/ai/fallback";
import {
  getBodyModelChain,
  getHighQualityModel,
} from "@/lib/server/ai/gemini";
import { DESIGN_SYSTEM_PROMPT } from "@/lib/server/ai/prompts/design";
import { buildFeedbackAddendum } from "@/lib/server/ai/feedback-addendum";
import { uploadJsonBlob } from "@/lib/server/storage/r2";
import { extractedBlobPath } from "@/lib/server/storage/extracted-blob";
import { LIMITS } from "@/lib/constants/limits";
import { INSPIRATION_PIPELINE_LIMITS } from "@/lib/constants/inspiration";
import { logEvent, logError, startTimer } from "@/lib/server/logger";
import { classifyError, ERROR_CODES } from "@/lib/server/ai/error-message";
import { addDailyBudgetTokens } from "@/lib/server/quota/daily-budget";
import { estimateTokensFromChars } from "@/lib/server/ai/token-estimate";
import {
  InspirationVisionTokensSchema,
  type InspirationVisionTokens,
} from "@/lib/server/ai/schemas/inspiration-vision";
import type {
  GenerationMode,
  ExtractedDataSnapshot,
} from "@/lib/types/generation";
import type { RunEvent } from "@/lib/types/run-events";
import { buildFallbackSkillMeta } from "@/lib/server/ai/fallback-meta";
import type { SkillMeta } from "@/lib/server/ai/schemas/skill-meta";

interface PipelineFromImageInput {
  generationId: string;
  imageUrl: string;
  imageMediaType: string;
  sourceLabel: string;
  sourceHost: string;
  mode: GenerationMode;
  feedback?: string | null;
  signal?: AbortSignal;
  preExtractedTokens?: InspirationVisionTokens | null;
  prebuiltExtracted?: ExtractedDataSnapshot | null;
  parentSkillBodies?: string[];
}

const PROGRESS_FLUSH_MS = 1500;

export async function* runPipelineFromImage(
  input: PipelineFromImageInput
): AsyncGenerator<RunEvent, void, unknown> {
  const {
    generationId,
    imageUrl,
    imageMediaType,
    sourceLabel,
    sourceHost,
    mode,
    feedback,
  } = input;
  const wallClockController = new AbortController();
  const wallClockTimer = setTimeout(
    () => wallClockController.abort(),
    LIMITS.pipelineWallClockMs
  );
  const composedSignal = composeSignals(input.signal, wallClockController.signal);
  const totalElapsed = startTimer();

  logEvent("pipeline.image.start", { generationId, mode, sourceHost });

  let body = "";

  try {
    yield { type: "status", status: "extracting" };
    await updateGenerationStatus(generationId, "extracting");

    const visionTokens =
      input.preExtractedTokens ??
      (await extractTokensWithVision({
        imageUrl,
        imageMediaType,
        sourceLabel,
      }));
    throwIfAborted(composedSignal);

    const extracted: ExtractedDataSnapshot =
      input.prebuiltExtracted ?? toExtractedSnapshot(visionTokens, sourceLabel);

    const extractedDataUrl = await uploadJsonBlob({
      pathname: extractedBlobPath(generationId),
      data: extracted,
    });
    void upsertArtifacts({
      generationId,
      screenshotAbove: imageUrl,
      screenshotFull: imageUrl,
      extractedDataUrl,
      extractedSummary: {
        colors: extracted.colors ?? [],
        fonts: extracted.fonts ?? [],
        favicon: null,
        ogImage: imageUrl,
        metaTitle: sourceLabel,
        metaDescription: visionTokens.vibe,
      },
    });

    yield {
      type: "artifacts",
      screenshotAbove: imageUrl,
      screenshotFull: imageUrl,
      colors: extracted.colors ?? [],
      fonts: extracted.fonts ?? [],
      pageTitle: sourceLabel,
      sourceHost,
    };

    yield { type: "status", status: "generating" };
    await updateGenerationStatus(generationId, "generating");

    const baseSystem = DESIGN_SYSTEM_PROMPT;
    const addendum = buildFeedbackAddendum(feedback);
    const system = addendum ? `${baseSystem}\n\n${addendum}` : baseSystem;
    const userText = buildBodyUserMessage({
      sourceLabel,
      sourceHost,
      visionTokens,
      parentSkillBodies: input.parentSkillBodies ?? [],
    });

    const aiBodyElapsed = startTimer();
    const result = await streamTextWithChain(getBodyModelChain(mode), {
      system,
      messages: [{ role: "user", content: userText }],
      abortSignal: AbortSignal.timeout(LIMITS.generationTimeoutMs),
    });

    let metaPromise: Promise<SkillMeta> | null = null;
    let lastFlush = Date.now();

    for await (const chunk of result.textStream) {
      throwIfAborted(composedSignal);
      body += chunk;
      yield { type: "token", delta: chunk };

      if (!metaPromise && body.length >= 1500) {
        metaPromise = generateSkillMeta({
          mode,
          url: sourceLabel,
          pageTitle: sourceLabel,
          body,
        }).catch((error) => {
          logError("pipeline.image.meta.failed", error, { generationId });
          return buildFallbackSkillMeta(sourceHost, sourceLabel, mode);
        });
      }

      if (Date.now() - lastFlush > PROGRESS_FLUSH_MS) {
        void updateSkillMdProgress(generationId, body);
        lastFlush = Date.now();
      }
    }

    logEvent("pipeline.image.body.done", {
      generationId,
      ms: aiBodyElapsed(),
      chars: body.length,
    });

    void addDailyBudgetTokens(estimateTokensFromChars(body.length)).catch(
      (error) => logError("pipeline.image.budget", error, { generationId })
    );

    if (body.length < LIMITS.minSkillBodyChars) {
      throw new Error(
        `Vision pipeline returned an empty body (${body.length} chars).`
      );
    }

    const meta =
      (await metaPromise) ??
      (await generateSkillMeta({
        mode,
        url: sourceLabel,
        pageTitle: sourceLabel,
        body,
      }).catch((error) => {
        logError("pipeline.image.meta.fallback", error, { generationId });
        return buildFallbackSkillMeta(sourceHost, sourceLabel, mode);
      }));

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

    logEvent("pipeline.image.done", { generationId, ms: totalElapsed() });
    yield { type: "status", status: "done" };
    yield { type: "done" };
  } catch (error) {
    const aborted = wallClockController.signal.aborted;
    const classified = aborted
      ? {
          message: `Inspiration timed out after ${Math.round(
            LIMITS.pipelineWallClockMs / 1000
          )}s`,
          code: ERROR_CODES.TIMEOUT,
          detail:
            error instanceof Error
              ? error.stack ?? error.message
              : "wall-clock timeout",
        }
      : classifyError(error);
    logError("pipeline.image.failed", error, {
      generationId,
      ms: totalElapsed(),
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

interface ExtractTokensInput {
  imageUrl: string;
  imageMediaType: string;
  sourceLabel: string;
}

async function extractTokensWithVision(
  input: ExtractTokensInput
): Promise<InspirationVisionTokens> {
  const elapsed = startTimer();
  try {
    const data = await fetchImageAsBase64(input.imageUrl);
    const result = await generateObject({
      model: getHighQualityModel(),
      schema: InspirationVisionTokensSchema,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Source label: ${input.sourceLabel}. Extract the design system tokens from the attached image.`,
            },
            {
              type: "image",
              image: data.base64,
              mediaType: data.mediaType ?? input.imageMediaType,
            },
          ],
        },
      ],
      abortSignal: AbortSignal.timeout(
        INSPIRATION_PIPELINE_LIMITS.visionWallClockMs
      ),
    });
    return result.object;
  } catch (error) {
    logError("pipeline.image.vision.failed", error, { ms: elapsed() });
    return synthesizeFallbackTokens(input.sourceLabel);
  }
}

interface FetchImageResult {
  base64: string;
  mediaType: string | null;
}

async function fetchImageAsBase64(url: string): Promise<FetchImageResult> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch inspiration image (status ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mediaType = response.headers.get("content-type");
  return { base64: buffer.toString("base64"), mediaType };
}

interface BuildBodyInput {
  sourceLabel: string;
  sourceHost: string;
  visionTokens: InspirationVisionTokens;
  parentSkillBodies: string[];
}

function buildBodyUserMessage(input: BuildBodyInput): string {
  const tokenJson = JSON.stringify(
    {
      brand: input.visionTokens.brand,
      mood: input.visionTokens.vibe,
      colors: input.visionTokens.colors,
      typography: input.visionTokens.typography,
      shadows: input.visionTokens.shadows,
      spacing: input.visionTokens.spacing,
      keywords: input.visionTokens.keywords,
    },
    null,
    2
  );

  const parents =
    input.parentSkillBodies.length > 0
      ? `\n\nParent inspirations to merge (each truncated):\n${input.parentSkillBodies
          .map((body, index) => `--- PARENT ${index + 1} ---\n${body.slice(0, 4000)}`)
          .join("\n\n")}`
      : "";

  return `Source: ${input.sourceLabel}
Host: ${input.sourceHost}

Vision-extracted tokens:
\`\`\`json
${tokenJson}
\`\`\`${parents}

Now produce the full design-system body. PART 1 is the \`\`\`yaml tokens block built from the vision tokens above. PART 2 is the eight prose sections that follow.`;
}

function toExtractedSnapshot(
  tokens: InspirationVisionTokens,
  sourceLabel: string
): ExtractedDataSnapshot {
  return {
    colors: tokens.colors.map((c) => c.hex),
    primary: tokens.colors[0]?.hex ?? null,
    fonts: tokens.typography.map((t) => t.fontFamily),
    fontSizes: tokens.typography.map((t) => t.fontSize),
    fontWeights: tokens.typography.map((t) => t.fontWeight),
    borderRadii: tokens.radii ?? [],
    shadows: tokens.shadows ?? [],
    spacing: tokens.spacing ?? [],
    headings: tokens.keywords ?? [],
    metaTitle: sourceLabel,
    metaDescription: tokens.vibe,
    favicon: null,
    ogImage: null,
    twitterImage: null,
    logo: null,
    assets: [],
  };
}

function synthesizeFallbackTokens(label: string): InspirationVisionTokens {
  return {
    brand: label,
    vibe: "Modern, balanced layout with a calm, confident palette.",
    colors: [
      { name: "primary", hex: "#1f1f1f" },
      { name: "canvas", hex: "#fafafa" },
      { name: "ink", hex: "#171717" },
      { name: "accent", hex: "#3b82f6" },
    ],
    typography: [
      {
        role: "display",
        fontFamily: "Inter",
        fontSize: 56,
        fontWeight: 600,
        lineHeight: 1.05,
      },
      {
        role: "body",
        fontFamily: "Inter",
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.5,
      },
    ],
    radii: ["6px", "12px"],
    shadows: ["0 1px 2px rgba(0,0,0,0.06)"],
    spacing: ["4px", "8px", "16px", "24px", "32px"],
    keywords: ["minimal", "calm", "balanced"],
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

const VISION_SYSTEM_PROMPT = `You are a senior visual designer extracting a design system from a single inspiration image.

You receive ONE image plus a short label describing where it came from.

Output a strict JSON object with these fields:
- brand: short label naming the design (use the source label if no brand is visible).
- vibe: 1–2 sentences describing mood, atmosphere, and target audience.
- colors: array of 4–10 entries with name (kebab-case) and 6-digit hex. The first entry is the most prominent chromatic color (the brand primary).
- typography: array of 2–4 type roles. Each has role (kebab-case), fontFamily (best-guess CSS family), fontSize (px integer), fontWeight (100-900 multiple of 100), lineHeight (number), letterSpacing (optional, px).
- radii: 2–4 corner-radius values as CSS strings.
- shadows: 1–3 box-shadow CSS strings (or just descriptions like "soft" if unclear).
- spacing: 4–8 CSS spacing values (e.g. "4px", "8px", "16px").
- keywords: 3–8 short adjectives describing the design.

Rules:
- All hex codes are 6-digit, lowercase, hash-prefixed.
- Prefer concrete CSS values over vague words.
- Never invent a brand name. If unclear, use the source label.`;

