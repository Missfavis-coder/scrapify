import {
  getRefreshContext,
  releaseRefreshLock,
  tryClaimRefreshLock,
  type RefreshContext,
} from "@/lib/server/db/queries/generations";
import {
  archiveCurrentVersion,
  resetGenerationToPending,
} from "@/lib/server/db/queries/generation-versions";
import { getGenerationWithArtifacts } from "@/lib/server/db/queries/generations";
import { probeSourceHeaders } from "@/lib/server/refresh/source-probe";
import { listWebhooksForGeneration } from "@/lib/server/db/queries/webhook-configs";
import { dispatchSourceChangedToAll } from "@/lib/server/webhooks/dispatch";
import { logEvent, logError } from "@/lib/server/logger";

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const LOCK_TTL_MS = 5 * 60 * 1000;

interface SkipInfo {
  reason:
    | "not_found"
    | "not_public"
    | "not_done"
    | "not_stale"
    | "in_cooldown"
    | "lock_busy";
}

type LazyRefreshOutcome =
  | { ok: false; skipped: SkipInfo }
  | { ok: true; result: "head_unchanged" | "regen_queued" };

function isStale(updatedAt: Date): boolean {
  return updatedAt.getTime() < Date.now() - STALE_AFTER_MS;
}

function withinCooldown(lastCheck: Date | null): boolean {
  if (!lastCheck) return false;
  return lastCheck.getTime() > Date.now() - COOLDOWN_MS;
}

function shouldRun(ctx: RefreshContext): SkipInfo | null {
  if (!ctx.isPublic) return { reason: "not_public" };
  if (ctx.status !== "done") return { reason: "not_done" };
  if (!isStale(ctx.updatedAt)) return { reason: "not_stale" };
  if (withinCooldown(ctx.lastRefreshCheckAt)) return { reason: "in_cooldown" };
  return null;
}

export async function isLazyRefreshActive(generationId: string): Promise<boolean> {
  const ctx = await getRefreshContext(generationId);
  if (!ctx?.refreshLockAt) return false;
  return ctx.refreshLockAt.getTime() > Date.now() - LOCK_TTL_MS;
}

export async function triggerLazyRefreshIfStale(
  generationId: string
): Promise<LazyRefreshOutcome> {
  const ctx = await getRefreshContext(generationId);
  if (!ctx) return { ok: false, skipped: { reason: "not_found" } };
  const skip = shouldRun(ctx);
  if (skip) return { ok: false, skipped: skip };

  const claimed = await tryClaimRefreshLock(generationId, LOCK_TTL_MS);
  if (!claimed) return { ok: false, skipped: { reason: "lock_busy" } };

  try {
    const probe = await probeSourceHeaders(ctx.sourceUrl, {
      etag: ctx.sourceEtag,
      lastModified: ctx.sourceLastModified,
    });

    const sameEtag = ctx.sourceEtag && probe.headers.etag === ctx.sourceEtag;
    const sameLastModified =
      ctx.sourceLastModified && probe.headers.lastModified === ctx.sourceLastModified;

    if (probe.status === 304 || sameEtag || sameLastModified) {
      await releaseRefreshLock(generationId, {
        etag: probe.headers.etag ?? ctx.sourceEtag,
        lastModified: probe.headers.lastModified ?? ctx.sourceLastModified,
        touchUpdated: true,
      });
      logEvent("lazy-refresh.head-unchanged", { generationId });
      return { ok: true, result: "head_unchanged" };
    }

    const generation = await getGenerationWithArtifacts(generationId);
    if (!generation) {
      await releaseRefreshLock(generationId, { touchUpdated: false });
      return { ok: false, skipped: { reason: "not_found" } };
    }

    await archiveCurrentVersion({
      generationId: generation.id,
      skillMd: generation.artifacts.skillMd,
      skillName: generation.artifacts.skillName,
      skillDescription: generation.artifacts.skillDescription,
      extractedData: generation.artifacts.extractedData,
    });

    await resetGenerationToPending(generationId);
    await releaseRefreshLock(generationId, {
      etag: probe.headers.etag,
      lastModified: probe.headers.lastModified,
      touchUpdated: false,
    });

    void notifyWebhooksForChange(generation).catch((dispatchError) => {
      logError("lazy-refresh.webhook-dispatch-failed", dispatchError, {
        generationId,
      });
    });

    logEvent("lazy-refresh.regen-queued", { generationId });
    return { ok: true, result: "regen_queued" };
  } catch (error) {
    await releaseRefreshLock(generationId, { touchUpdated: false }).catch(() => undefined);
    logError("lazy-refresh.failed", error, { generationId });
    throw error;
  }
}

async function notifyWebhooksForChange(generation: {
  id: string;
  sourceUrl: string;
  sourceHost: string;
  artifacts: { skillName: string | null };
}): Promise<void> {
  const webhooks = await listWebhooksForGeneration(generation.id);
  if (webhooks.length === 0) return;
  await dispatchSourceChangedToAll(webhooks, {
    generationId: generation.id,
    slug: generation.artifacts.skillName ?? null,
    sourceUrl: generation.sourceUrl,
    sourceHost: generation.sourceHost,
    changedAt: new Date().toISOString(),
    previousVersion: null,
    nextVersion: null,
    summary: "Source page changed; skill regeneration queued.",
  });
}
