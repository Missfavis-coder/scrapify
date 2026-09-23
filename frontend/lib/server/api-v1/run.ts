import { runGenerationPipeline } from "@/lib/server/ai/pipeline";
import {
  claimGenerationRun,
  clearGenerationRunLock,
  updateGenerationStatus,
} from "@/lib/server/db/queries/generations";
import { classifyError } from "@/lib/server/ai/error-message";
import { logError, logEvent } from "@/lib/server/logger";
import type { GenerationMode } from "@/lib/types/generation";

interface RunV1GenerationInput {
  generationId: string;
  url: string;
  mode: GenerationMode;
  sourceHost: string;
}

export async function runV1GenerationBackground(
  input: RunV1GenerationInput
): Promise<void> {
  const claim = await claimGenerationRun(input.generationId);
  if (!claim.ok) {
    logEvent("v1.generate.run.claim_skipped", {
      generationId: input.generationId,
      reason: claim.reason,
    });
    return;
  }

  try {
    const pipeline = runGenerationPipeline({
      generationId: input.generationId,
      url: input.url,
      mode: input.mode,
      sourceHost: input.sourceHost,
      sourceKind: "public_url",
    });
    for await (const _event of pipeline) {
      void _event;
    }
  } catch (error) {
    const classified = classifyError(error);
    logError("v1.generate.run.failed", error, {
      generationId: input.generationId,
      errorCode: classified.code,
    });
    await updateGenerationStatus(
      input.generationId,
      "failed",
      classified.message,
      { code: classified.code, detail: classified.detail }
    ).catch((updateError) =>
      logError("v1.generate.run.status_update_failed", updateError, {
        generationId: input.generationId,
      })
    );
  } finally {
    await clearGenerationRunLock(input.generationId).catch((clearError) =>
      logError("v1.generate.run.lock_clear_failed", clearError, {
        generationId: input.generationId,
      })
    );
  }
}
