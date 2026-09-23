import { eq } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { generations } from "@/lib/server/db/schema";
import { logError } from "@/lib/server/logger";

const HEAD_TIMEOUT_MS = 8000;
const USER_AGENT = "getskillmd-bot/1.0 (+https://getskillmd.com)";

export interface SourceHeaders {
  etag: string | null;
  lastModified: string | null;
}

export async function probeSourceHeaders(
  url: string,
  conditional?: { etag: string | null; lastModified: string | null }
): Promise<{ status: number; headers: SourceHeaders }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (conditional?.etag) headers["If-None-Match"] = conditional.etag;
    if (conditional?.lastModified)
      headers["If-Modified-Since"] = conditional.lastModified;
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers,
    });
    return {
      status: response.status,
      headers: {
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
      },
    };
  } catch {
    return { status: 0, headers: { etag: null, lastModified: null } };
  } finally {
    clearTimeout(timer);
  }
}

export async function captureSourceBaseline(
  generationId: string,
  url: string
): Promise<void> {
  try {
    const result = await probeSourceHeaders(url);
    const db = getDb();
    await db
      .update(generations)
      .set({
        sourceEtag: result.headers.etag,
        sourceLastModified: result.headers.lastModified,
      })
      .where(eq(generations.id, generationId));
  } catch (error) {
    logError("source-probe.baseline", error, { generationId });
  }
}
