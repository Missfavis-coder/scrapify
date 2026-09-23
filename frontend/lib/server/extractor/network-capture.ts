import type { Page } from "playwright-core";
import type { NetworkAsset } from "@/lib/types/extraction";

const EXTENSION_TYPES: Record<string, string> = {
  mp4: "video",
  webm: "video",
  mov: "video",
  m4v: "video",
  m3u8: "video-stream",
  mpd: "video-stream",
  mp3: "audio",
  wav: "audio",
  ogg: "audio",
  m4a: "audio",
  glb: "3d-model",
  gltf: "3d-model",
  usdz: "3d-model",
  ktx2: "3d-texture",
  basis: "3d-texture",
  hdr: "3d-env",
  exr: "3d-env",
  draco: "3d-geometry",
  wasm: "wasm",
  woff: "font",
  woff2: "font",
  ttf: "font",
  otf: "font",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  avif: "image",
  gif: "image",
  svg: "image",
  json: "data",
  lottie: "lottie",
};

function classify(url: string, resourceType: string): string | null {
  if (resourceType === "image" || resourceType === "media" || resourceType === "font") {
    return resourceType;
  }
  const path = url.split("?")[0].split("#")[0];
  const dot = path.lastIndexOf(".");
  if (dot === -1) return null;
  const ext = path.slice(dot + 1).toLowerCase();
  return EXTENSION_TYPES[ext] ?? null;
}

const SEGMENT_EXTENSIONS = new Set(["ts", "m4s"]);

function segmentStreamDir(url: string): string | null {
  const path = url.split("?")[0].split("#")[0];
  const dot = path.lastIndexOf(".");
  if (dot === -1) return null;
  if (!SEGMENT_EXTENSIONS.has(path.slice(dot + 1).toLowerCase())) return null;
  const slash = path.lastIndexOf("/");
  return slash === -1 ? path : path.slice(0, slash + 1);
}

export function attachNetworkRecorder(page: Page, max: number): NetworkAsset[] {
  const assets: NetworkAsset[] = [];
  const seen = new Set<string>();

  page.on("request", (request) => {
    if (assets.length >= max) return;
    const url = request.url();
    if (!url.startsWith("http")) return;

    const streamDir = segmentStreamDir(url);
    if (streamDir) {
      if (seen.has(streamDir)) return;
      seen.add(streamDir);
      assets.push({ url: streamDir, type: "video-stream" });
      return;
    }

    if (seen.has(url)) return;
    const type = classify(url, request.resourceType());
    if (!type) return;
    seen.add(url);
    assets.push({ url, type });
  });

  return assets;
}
