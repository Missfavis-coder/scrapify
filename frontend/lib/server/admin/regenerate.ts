import {
  archiveCurrentVersion,
  resetGenerationToPending,
  setGenerationFeedback,
} from "@/lib/server/db/queries/generation-versions";
import {
  clearAdminRescuePending,
  markAdminRescuePending,
} from "@/lib/server/db/queries/admin-rescue";
import {
  claimGenerationRun,
  clearGenerationRunLock,
  getGenerationOwnership,
  getGenerationWithArtifacts,
} from "@/lib/server/db/queries/generations";
import { runGenerationPipeline } from "@/lib/server/ai/pipeline";
import { notifyOwnerOfAdminRescue } from "@/lib/server/skill/rescue-notification";
import { logEvent, logError } from "@/lib/server/logger";

export type AdminRegenerateOutcome =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

interface AdminRegenerateInput {
  id: string;
  feedback: string | null;
  reason: "refresh" | "regenerate-with-instruction";
}

export async function adminPrepareRerun(
  input: AdminRegenerateInput
): Promise<AdminRegenerateOutcome> {
  const { id, feedback, reason } = input;

  const owner = await getGenerationOwnership(id);
  if (!owner) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Generation not found" };
  }

  if (owner.status !== "done" && owner.status !== "failed") {
    return {
      ok: false,
      status: 409,
      code: "NOT_READY",
      message: `Generation is currently ${owner.status}`,
    };
  }

  const generation = await getGenerationWithArtifacts(id);
  if (!generation) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Generation not found" };
  }

  await archiveCurrentVersion({
    generationId: id,
    skillMd: generation.artifacts.skillMd,
    skillName: generation.artifacts.skillName,
    skillDescription: generation.artifacts.skillDescription,
    extractedData: generation.artifacts.extractedData,
  });

  const isRescue = owner.status === "failed" && Boolean(owner.userId);
  if (isRescue) {
    await markAdminRescuePending(id);
  }

  const reset = await resetGenerationToPending(id);
  if (!reset) {
    if (isRescue) {
      await clearAdminRescuePending(id).catch(() => undefined);
    }
    return {
      ok: false,
      status: 409,
      code: "RESET_FAILED",
      message: "Could not reset generation",
    };
  }

  await setGenerationFeedback(id, feedback);
  logEvent("admin.rerun.prepared", {
    id,
    reason,
    hasFeedback: Boolean(feedback),
    isRescue,
  });
  return { ok: true };
}

export async function adminRegenerate(
  input: AdminRegenerateInput
): Promise<AdminRegenerateOutcome> {
  const { id, feedback, reason } = input;

  const prepared = await adminPrepareRerun(input);
  if (!prepared.ok) return prepared;

  const generation = await getGenerationWithArtifacts(id);
  if (!generation) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "Generation not found" };
  }

  const claim = await claimGenerationRun(id);
  if (!claim.ok) {
    return {
      ok: false,
      status: 409,
      code: claim.reason === "already_running" ? "ALREADY_RUNNING" : "CLAIM_FAILED",
      message:
        claim.reason === "already_running"
          ? "Generation is already running"
          : "Could not claim generation",
    };
  }

  logEvent("admin.regenerate.start", { id, reason, hasFeedback: Boolean(feedback) });
  let didFinish = false;

  try {
    const iterator = runGenerationPipeline({
      generationId: id,
      url: generation.sourceUrl,
      mode: generation.mode,
      feedback,
    });

    for await (const event of iterator) {
      if (event.type === "done" || event.type === "error") {
        didFinish = true;
        if (event.type === "error") {
          logEvent("admin.regenerate.failed", { id, reason, message: event.message });
          return {
            ok: false,
            status: 500,
            code: "PIPELINE_FAILED",
            message: event.message,
          };
        }
        break;
      }
    }
    logEvent("admin.regenerate.done", { id, reason });
    await notifyOwnerOfAdminRescue(id);
    return { ok: true };
  } catch (error) {
    logError("admin.regenerate.threw", error, { id, reason });
    return {
      ok: false,
      status: 500,
      code: "PIPELINE_THREW",
      message: error instanceof Error ? error.message : "pipeline error",
    };
  } finally {
    if (!didFinish) {
      await clearGenerationRunLock(id).catch(() => undefined);
    }
  }
}
