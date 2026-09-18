import { INSPIRATION_FIGMA, INSPIRATION_HTTP } from "@/lib/constants/inspiration";
import { getServerEnv } from "@/lib/server/env";
import { logError, logEvent } from "@/lib/server/logger";

export interface FigmaParseResult {
  fileKey: string;
  nodeId: string | null;
  fileUrl: string;
}

const FIGMA_FILE_URL_PATTERN =
  /^https?:\/\/(?:www\.)?figma\.com\/(?:file|design)\/([a-zA-Z0-9-_]+)/i;
const NODE_ID_PARAM = "node-id";

export function parseFigmaUrl(rawUrl: string): FigmaParseResult | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const match = rawUrl.match(FIGMA_FILE_URL_PATTERN);
  if (!match) return null;
  const fileKey = match[1];
  const nodeIdRaw = url.searchParams.get(NODE_ID_PARAM);
  const nodeId = nodeIdRaw ? nodeIdRaw.replace(/-/g, ":") : null;
  return {
    fileKey,
    nodeId,
    fileUrl: `https://www.figma.com/file/${fileKey}`,
  };
}

export interface FigmaPreviewResult {
  previewImageUrl: string | null;
  pageTitle: string | null;
}

interface FigmaImagesResponse {
  err: string | null;
  images: Record<string, string | null>;
}

interface FigmaFileMetaFields {
  name?: string;
  thumbnail_url?: string;
  thumbnailUrl?: string;
}

interface FigmaFileMetaResponseRaw extends FigmaFileMetaFields {
  file?: FigmaFileMetaFields;
}

interface NormalizedFigmaMeta {
  name: string | null;
  thumbnailUrl: string | null;
}

export function isFigmaServiceTokenConfigured(): boolean {
  const token = getServerEnv().FIGMA_TOKEN;
  return Boolean(token && token.trim().length > 0);
}

export type FigmaCredentialKind = "user" | "env";

export interface FigmaCredential {
  token: string;
  kind: FigmaCredentialKind;
}

export async function fetchFigmaPreview(
  parsed: FigmaParseResult,
  credential: FigmaCredential
): Promise<FigmaPreviewResult | null> {
  if (!credential.token) return null;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    INSPIRATION_HTTP.fetchTimeoutMs
  );
  try {
    if (parsed.nodeId) {
      const params = new URLSearchParams({
        ids: parsed.nodeId,
        format: "png",
        scale: "2",
      });
      const imagesUrl = `${INSPIRATION_FIGMA.apiBase}/images/${parsed.fileKey}?${params.toString()}`;
      const imageRes = await fetch(imagesUrl, {
        headers: {
          ...buildFigmaAuthHeader(credential),
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      if (imageRes.ok) {
        const data = (await imageRes.json()) as FigmaImagesResponse;
        const previewImageUrl = data.images?.[parsed.nodeId] ?? null;
        if (previewImageUrl) {
          const pageTitle = await fetchFigmaFileName({
            fileKey: parsed.fileKey,
            credential,
            signal: controller.signal,
          });
          return { previewImageUrl, pageTitle };
        }
      } else {
        logEvent("figma.api.images.non_ok", {
          fileKey: parsed.fileKey,
          nodeId: parsed.nodeId,
          status: imageRes.status,
          kind: credential.kind,
        });
      }
    }

    const meta = await fetchFigmaFileMeta({
      fileKey: parsed.fileKey,
      credential,
      signal: controller.signal,
    });
    if (!meta) return null;
    return {
      previewImageUrl: meta.thumbnailUrl,
      pageTitle: meta.name,
    };
  } catch (error) {
    logError("figma.preview.failed", error, { fileKey: parsed.fileKey });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface FetchFigmaMetaInput {
  fileKey: string;
  credential: FigmaCredential;
  signal: AbortSignal;
}

function buildFigmaAuthHeader(
  credential: FigmaCredential
): Record<string, string> {
  if (credential.kind === "user") {
    return { Authorization: `Bearer ${credential.token}` };
  }
  return { "X-Figma-Token": credential.token };
}

async function fetchFigmaFileMeta(
  input: FetchFigmaMetaInput
): Promise<NormalizedFigmaMeta | null> {
  const headers = {
    ...buildFigmaAuthHeader(input.credential),
    Accept: "application/json",
  };

  const metaRes = await fetch(
    `${INSPIRATION_FIGMA.apiBase}/files/${input.fileKey}/meta`,
    { headers, signal: input.signal }
  );
  if (metaRes.ok) {
    const raw = (await metaRes.json()) as FigmaFileMetaResponseRaw;
    const normalized = pickFigmaMetaFields(raw);
    if (normalized.thumbnailUrl || normalized.name) return normalized;
  } else {
    logEvent("figma.api.meta.non_ok", {
      fileKey: input.fileKey,
      status: metaRes.status,
      kind: input.credential.kind,
    });
  }

  const fileRes = await fetch(
    `${INSPIRATION_FIGMA.apiBase}/files/${input.fileKey}?depth=1`,
    { headers, signal: input.signal }
  );
  if (!fileRes.ok) {
    logEvent("figma.api.file.non_ok", {
      fileKey: input.fileKey,
      status: fileRes.status,
      kind: input.credential.kind,
    });
    return null;
  }
  const raw = (await fileRes.json()) as FigmaFileMetaResponseRaw;
  return pickFigmaMetaFields(raw);
}

function pickFigmaMetaFields(
  raw: FigmaFileMetaResponseRaw
): NormalizedFigmaMeta {
  const source: FigmaFileMetaFields = raw.file ?? raw;
  return {
    name: source.name?.trim() ? source.name.trim() : null,
    thumbnailUrl:
      source.thumbnail_url?.trim() ||
      source.thumbnailUrl?.trim() ||
      null,
  };
}

async function fetchFigmaFileName(
  input: FetchFigmaMetaInput
): Promise<string | null> {
  const meta = await fetchFigmaFileMeta(input);
  return meta?.name ?? null;
}
