import { zipSync } from "fflate";
import { toast } from "sonner";
import type { AssetPromptKind } from "@/lib/types/asset-prompt";
import type { ExtractedDataSnapshot } from "@/lib/types/generation";
import type { MediaAsset } from "@/lib/types/extraction";

export type AssetCategory =
  | "image"
  | "video"
  | "animation"
  | "model"
  | "audio"
  | "embed";

export interface AssetItem {
  url: string;
  label: string;
  kind: AssetPromptKind;
  badge?: string;
  category: AssetCategory;
  previewable: boolean;
}

export function buildAssetItems(input: {
  extractedData: ExtractedDataSnapshot;
  screenshotAbove: string | null;
  screenshotFull: string | null;
  excludeUrls?: ReadonlySet<string>;
}): AssetItem[] {
  const { extractedData, screenshotAbove, screenshotFull, excludeUrls } = input;
  const seen = new Set<string>();
  const items: AssetItem[] = [];

  const push = (
    url: string | null | undefined,
    label: string,
    kind: AssetPromptKind,
    badge: string | undefined,
    category: AssetCategory,
    previewable: boolean
  ) => {
    if (!url || seen.has(url) || excludeUrls?.has(url)) return;
    seen.add(url);
    items.push({ url, label, kind, badge, category, previewable });
  };

  push(extractedData.favicon, "Favicon", "favicon", "favicon", "image", true);
  push(extractedData.logo, "Logo", "logo", "logo", "image", true);
  push(extractedData.ogImage, "OG image", "og:image", "og:image", "image", true);
  push(extractedData.twitterImage, "Twitter image", "twitter", "twitter", "image", true);
  push(screenshotAbove, "Above-the-fold", "screenshot", "screenshot", "image", true);
  push(screenshotFull, "Full page", "screenshot", "screenshot", "image", true);
  for (const url of extractedData.assets ?? []) {
    push(url, fileNameFromUrl(url), "asset", undefined, "image", true);
  }

  for (const media of extractedData.motion?.media ?? []) {
    const category = categoryForMedia(media.kind);
    push(
      media.url,
      fileNameFromUrl(media.url),
      "asset",
      media.role ?? media.kind,
      category,
      category === "image"
    );
  }

  for (const asset of extractedData.motion?.networkAssets ?? []) {
    const category = NETWORK_CATEGORIES[asset.type];
    if (!category) continue;
    push(asset.url, fileNameFromUrl(asset.url), "asset", asset.type, category, false);
  }

  return items;
}

function categoryForMedia(kind: MediaAsset["kind"]): AssetCategory {
  switch (kind) {
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "iframe":
      return "embed";
    case "lottie":
      return "animation";
    default:
      return "image";
  }
}

const NETWORK_CATEGORIES: Record<string, AssetCategory> = {
  video: "video",
  "video-stream": "video",
  "3d-model": "model",
  "3d-texture": "model",
  "3d-env": "model",
  "3d-geometry": "model",
  wasm: "model",
  audio: "audio",
  lottie: "animation",
};

function fileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() ?? parsed.hostname;
    return decodeURIComponent(last).slice(0, 30);
  } catch {
    return "asset";
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function downloadFilename(asset: AssetItem): string {
  const base = slugify(asset.badge ?? asset.label) || "asset";
  try {
    const parsed = new URL(asset.url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
    const decoded = decodeURIComponent(last);
    const dot = decoded.lastIndexOf(".");
    const ext = dot > -1 ? decoded.slice(dot + 1).toLowerCase() : "";
    if (ext && ext.length <= 5 && /^[a-z0-9]+$/.test(ext)) {
      return `${base}.${ext}`;
    }
  } catch {}
  return base;
}

function uniqueZipNames(assets: AssetItem[]): Map<string, string> {
  const used = new Set<string>();
  const result = new Map<string, string>();

  for (const asset of assets) {
    let name = downloadFilename(asset);
    let suffix = 2;
    while (used.has(name)) {
      const dot = name.lastIndexOf(".");
      name =
        dot > 0
          ? `${name.slice(0, dot)}-${suffix}${name.slice(dot)}`
          : `${name}-${suffix}`;
      suffix += 1;
    }
    used.add(name);
    result.set(asset.url, name);
  }

  return result;
}

async function fetchAssetBlob(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    return null;
  }
}

function triggerBlobDownload(data: Uint8Array, mimeType: string, filename: string): void {
  const blob = new Blob([Uint8Array.from(data)], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
}

export async function downloadAsset(asset: AssetItem): Promise<void> {
  const filename = downloadFilename(asset);
  const data = await fetchAssetBlob(asset.url);
  if (data) {
    triggerBlobDownload(data, "application/octet-stream", filename);
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = asset.url;
  anchor.download = filename;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  toast.message("Opened in a new tab — host blocked direct download");
}

export async function downloadAllAssetsAsZip(
  assets: AssetItem[],
  archiveBaseName: string
): Promise<void> {
  if (assets.length === 0) return;

  const names = uniqueZipNames(assets);
  const entries: Record<string, Uint8Array> = {};
  const skipped: string[] = [];

  await Promise.all(
    assets.map(async (asset) => {
      const data = await fetchAssetBlob(asset.url);
      const entryName = names.get(asset.url);
      if (!data || !entryName) {
        skipped.push(asset.label);
        return;
      }
      entries[entryName] = data;
    })
  );

  const included = Object.keys(entries).length;
  if (included === 0) {
    toast.error("Could not download assets — hosts blocked access");
    return;
  }

  const zipped = zipSync(entries);
  const archiveName = `${slugify(archiveBaseName) || "assets"}.zip`;
  triggerBlobDownload(zipped, "application/zip", archiveName);

  if (skipped.length > 0) {
    toast.message(
      `Downloaded ${included} of ${assets.length} assets — ${skipped.length} skipped (CORS blocked)`
    );
    return;
  }

  toast.success(`Downloaded ${included} assets`);
}
