import {
  uploadJsonBlob,
  downloadJsonBlob,
  deleteJsonByUrl,
  buildPublicUrl,
} from "@/lib/server/storage/r2";
import type { ExtractedPage } from "@/lib/types/extraction";

export function pagesBlobPath(generationId: string): string {
  return `pages/${generationId}.json`;
}

export function pagesBlobPublicUrl(generationId: string): string {
  return buildPublicUrl(pagesBlobPath(generationId));
}

export async function uploadPagesSnapshot(
  generationId: string,
  pages: ExtractedPage[]
): Promise<string> {
  return uploadJsonBlob({
    pathname: pagesBlobPath(generationId),
    data: pages,
  });
}

export async function loadPagesSnapshotById(
  generationId: string
): Promise<ExtractedPage[] | null> {
  const url = pagesBlobPublicUrl(generationId);
  const remote = await downloadJsonBlob<ExtractedPage[]>(url);
  return remote ?? null;
}

export async function deletePagesSnapshotByUrl(url: string | null): Promise<void> {
  if (!url) return;
  await deleteJsonByUrl(url);
}
