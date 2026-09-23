import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
import { getServerEnv } from "@/lib/server/env";
import { logEvent } from "@/lib/server/logger";
import type { ModelChain, ModelEntry } from "@/lib/server/ai/fallback";
import type { GenerationMode } from "@/lib/types/generation";

const FLASH_ID = "gemini-2.5-flash";
const FLASH_LITE_ID = "gemini-2.5-flash-lite";
const PRO_ID = "gemini-2.5-pro";

const SMALL_CONTENT_BYTES = 5 * 1024;

export type GeminiModelId =
  | typeof FLASH_ID
  | typeof FLASH_LITE_ID
  | typeof PRO_ID;

type GeminiProviderKind = "google" | "vertex";

interface GeminiProviderHandle {
  kind: GeminiProviderKind;
  model: (id: GeminiModelId) => ModelEntry["model"];
}

type VertexSettings = NonNullable<Parameters<typeof createVertex>[0]>;
type VertexAuthOptions = NonNullable<VertexSettings["googleAuthOptions"]>;
type VertexCredentials = VertexAuthOptions["credentials"];

let cached: GeminiProviderHandle | null = null;

function parseVertexCredentials(raw: string): VertexCredentials {
  for (const candidate of [raw, decodeBase64(raw)]) {
    if (!candidate || !candidate.trim().startsWith("{")) continue;
    try {
      return JSON.parse(candidate) as VertexCredentials;
    } catch {
      continue;
    }
  }
  throw new Error(
    "GOOGLE_VERTEX_CREDENTIALS_JSON must be a service-account JSON object (raw or base64-encoded)"
  );
}

function decodeBase64(value: string): string | null {
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function resolveVertexAuth(env: {
  GOOGLE_VERTEX_CREDENTIALS_JSON?: string;
  GOOGLE_APPLICATION_CREDENTIALS?: string;
}): { options: VertexAuthOptions | null; source: "inline" | "keyFile" | "adc" } {
  if (env.GOOGLE_VERTEX_CREDENTIALS_JSON) {
    return {
      options: {
        credentials: parseVertexCredentials(env.GOOGLE_VERTEX_CREDENTIALS_JSON),
      },
      source: "inline",
    };
  }
  if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    return {
      options: { keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS },
      source: "keyFile",
    };
  }
  return { options: null, source: "adc" };
}

function buildProvider(): GeminiProviderHandle {
  const env = getServerEnv();

  if (env.AI_GEMINI_PROVIDER === "vertex") {
    if (!env.GOOGLE_VERTEX_PROJECT || !env.GOOGLE_VERTEX_LOCATION) {
      throw new Error(
        "AI_GEMINI_PROVIDER=vertex requires GOOGLE_VERTEX_PROJECT and GOOGLE_VERTEX_LOCATION to be set"
      );
    }
    const auth = resolveVertexAuth(env);
    const vertex = createVertex({
      project: env.GOOGLE_VERTEX_PROJECT,
      location: env.GOOGLE_VERTEX_LOCATION,
      ...(auth.options ? { googleAuthOptions: auth.options } : {}),
    });
    logEvent("ai.provider.initialized", {
      provider: "vertex",
      project: env.GOOGLE_VERTEX_PROJECT,
      location: env.GOOGLE_VERTEX_LOCATION,
      credentials: auth.source,
    });
    return { kind: "vertex", model: (id) => vertex(id) };
  }

  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is required when AI_GEMINI_PROVIDER=google"
    );
  }
  const google = createGoogleGenerativeAI({
    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
  });
  logEvent("ai.provider.initialized", { provider: "google" });
  return { kind: "google", model: (id) => google(id) };
}

function getProvider(): GeminiProviderHandle {
  cached ??= buildProvider();
  return cached;
}

function entry(id: GeminiModelId): ModelEntry {
  return { id, model: getProvider().model(id) };
}

function chainOf(...ids: GeminiModelId[]): ModelChain {
  return { entries: ids.map(entry) };
}

interface PickModelOpts {
  contentLength: number;
  mode: GenerationMode;
}

export function pickModel(opts: PickModelOpts): GeminiModelId {
  if (opts.mode === "generic") return FLASH_ID;
  if (opts.contentLength < SMALL_CONTENT_BYTES) return FLASH_ID;
  return PRO_ID;
}

function isVisionMode(mode: GenerationMode): boolean {
  return mode === "design" || mode === "motion";
}

export function getBodyModelChain(mode: GenerationMode): ModelChain {
  if (isVisionMode(mode)) {
    return chainOf(PRO_ID, FLASH_ID, FLASH_LITE_ID);
  }
  return chainOf(FLASH_LITE_ID, FLASH_ID);
}

export function getRoutedBodyModelChain(opts: PickModelOpts): ModelChain {
  if (isVisionMode(opts.mode)) {
    return chainOf(PRO_ID, FLASH_ID, FLASH_LITE_ID);
  }
  const primaryId = pickModel(opts);
  if (primaryId === PRO_ID) return chainOf(PRO_ID, FLASH_ID, FLASH_LITE_ID);
  if (primaryId === FLASH_ID) return chainOf(FLASH_ID, FLASH_LITE_ID);
  return chainOf(FLASH_LITE_ID, FLASH_ID);
}

export function getMetaModelChain(): ModelChain {
  return chainOf(FLASH_LITE_ID, FLASH_ID);
}

export function getFastVisionModelChain(): ModelChain {
  return chainOf(FLASH_LITE_ID, FLASH_ID);
}

export function getEvaluationModel(): ModelEntry {
  return entry(FLASH_ID);
}

export function getEvaluationModelChain(): ModelChain {
  return chainOf(FLASH_ID, FLASH_LITE_ID);
}

export function getHighQualityModel() {
  return getProvider().model(PRO_ID);
}
