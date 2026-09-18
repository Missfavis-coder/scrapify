import { generateObject, type ModelMessage } from "ai";
import { getFastVisionModelChain } from "@/lib/server/ai/gemini";
import type { ModelEntry } from "@/lib/server/ai/fallback";
import {
  ASSET_PROMPT_SYSTEM,
  buildAssetPromptUserText,
} from "@/lib/server/ai/prompts/asset-prompt";
import { AssetPromptSchema } from "@/lib/server/ai/schemas/asset-prompt";
import { logError, logEvent, startTimer } from "@/lib/server/logger";
import type { AssetPromptKind, AssetPromptResult } from "@/lib/types/asset-prompt";

const VISION_TIMEOUT_MS = 20_000;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif",
]);

interface GenerateAssetPromptInput {
  assetUrl: string;
  kind: AssetPromptKind;
  label: string;
  brandName: string | null;
  brandDescription: string | null;
  colors: string[];
  primary: string | null;
  fonts: string[];
}

export async function generateAssetPrompt(
  input: GenerateAssetPromptInput
): Promise<AssetPromptResult> {
  const elapsed = startTimer();
  const userText = buildAssetPromptUserText(input);
  const image = await fetchImageAsBase64(input.assetUrl).catch(() => null);

  const content: ModelMessage["content"] =
    image && SUPPORTED_IMAGE_TYPES.has(image.mediaType)
      ? [
          { type: "text", text: userText },
          { type: "image", image: image.base64, mediaType: image.mediaType },
        ]
      : userText;

  const messages: ModelMessage[] = [{ role: "user", content }];
  const chain = getFastVisionModelChain();

  let result: AssetPromptResult | null = null;
  for (const entry of chain.entries) {
    result = await tryGenerate(entry, messages);
    if (result) break;
  }

  if (!result) {
    throw new Error("Asset prompt generation failed on all models");
  }

  logEvent("asset.prompt.generated", {
    kind: input.kind,
    ms: elapsed(),
    withImage: Boolean(image),
  });

  return {
    summary: result.summary,
    prompt: result.prompt,
    negativePrompt: result.negativePrompt,
    styleTags: result.styleTags,
    aspectRatio: result.aspectRatio,
  };
}

async function tryGenerate(
  entry: ModelEntry,
  messages: ModelMessage[]
): Promise<AssetPromptResult | null> {
  try {
    const { object } = await generateObject({
      model: entry.model,
      schema: AssetPromptSchema,
      system: ASSET_PROMPT_SYSTEM,
      messages,
      abortSignal: AbortSignal.timeout(VISION_TIMEOUT_MS),
    });
    return object;
  } catch (error) {
    logError("asset.prompt.model_failed", error, { model: entry.id });
    return null;
  }
}

interface FetchImageResult {
  base64: string;
  mediaType: string;
}

async function fetchImageAsBase64(url: string): Promise<FetchImageResult> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch asset (status ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Asset too large for vision");
  }
  const buffer = Buffer.from(arrayBuffer);
  const mediaType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return { base64: buffer.toString("base64"), mediaType };
}
