import {
  uploadJsonBlob,
  downloadJsonBlob,
  deleteJsonByUrl,
} from "@/lib/server/storage/r2";
import { prioritizePalette } from "@/lib/utils/palette";
import type {
  ExtractedDataSnapshot,
  ExtractedSummary,
} from "@/lib/types/generation";

const SUMMARY_PALETTE_SIZE = 6;
const SUMMARY_FONTS_SIZE = 3;

export function buildExtractedSummary(
  snapshot: ExtractedDataSnapshot
): ExtractedSummary {
  const colors = prioritizePalette(snapshot.colors ?? [], SUMMARY_PALETTE_SIZE);
  const fonts = (snapshot.fonts ?? []).slice(0, SUMMARY_FONTS_SIZE);
  return {
    colors,
    fonts,
    favicon: snapshot.favicon ?? null,
    ogImage: snapshot.ogImage ?? null,
    metaTitle: snapshot.metaTitle,
    metaDescription: snapshot.metaDescription,
  };
}

export function extractedBlobPath(generationId: string): string {
  return `extracted/${generationId}.json`;
}

export function extractedVersionBlobPath(versionId: string): string {
  return `extracted-versions/${versionId}.json`;
}

export async function uploadExtractedSnapshot(
  generationId: string,
  snapshot: ExtractedDataSnapshot
): Promise<string> {
  return uploadJsonBlob({
    pathname: extractedBlobPath(generationId),
    data: snapshot,
  });
}

export async function uploadVersionSnapshot(
  versionId: string,
  snapshot: ExtractedDataSnapshot
): Promise<string> {
  return uploadJsonBlob({
    pathname: extractedVersionBlobPath(versionId),
    data: snapshot,
  });
}

export async function loadExtractedSnapshot(opts: {
  url: string | null;
  fallback: ExtractedDataSnapshot | null;
}): Promise<ExtractedDataSnapshot> {
  if (opts.url) {
    const remote = await downloadJsonBlob<ExtractedDataSnapshot>(opts.url);
    if (remote) return remote;
  }
  return opts.fallback ?? {};
}

export async function deleteExtractedSnapshotByUrl(
  url: string | null
): Promise<void> {
  if (!url) return;
  await deleteJsonByUrl(url);
}
