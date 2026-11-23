
import "server-only";

import {
  completeRun,
  failRun,
  startRun,
} from "@/lib/server/db/queries/run";
import { createExecutionLog } from "@/lib/server/db/queries/logs";
import { createArtifact } from "@/lib/server/db/queries/artifacts";

interface ExecuteAutomationRunInput {
  runId: string;
  userId: string;
  url: string;
  instructions: string;
}

interface AgentResponse {
  success: boolean;
  result?: unknown;
  error?: string | null;
  steps_completed?: number;
  execution_history?: unknown[];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected execution error occurred.";
}

function getHistoryMetadata(item: unknown): Record<string, unknown> {
  if (typeof item === "object" && item !== null && !Array.isArray(item)) {
    return item as Record<string, unknown>;
  }

  return { value: item };
}

export async function executeAutomationRun(
  input: ExecuteAutomationRunInput,
): Promise<void> {
  const { runId, userId, url, instructions } = input;

  try {
    const run = await startRun(runId, userId);

    // Prevent duplicate workers from starting the same run.

    if (!run) {
      return;
    }

    await createExecutionLog({
      runId,
      userId,
      message: "Browser agent execution started.",
    });

    const baseUrl = process.env.SCRAPIFY_AI_URL?.replace(/\/+$/, "");

    if (!baseUrl) {
      throw new Error("SCRAPIFY_AI_URL is not configured.");
    }

    const response = await fetch(`${baseUrl}/agent/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: [
          `Website to visit: ${url}`,
          "",
          "Instructions:",
          instructions,
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(600_000),
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        `AI service returned HTTP ${response.status}.`,
      );
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("success" in payload) ||
      typeof payload.success !== "boolean"
    ) {
      throw new Error("The AI service returned an invalid response.");
    }

    const result = payload as AgentResponse;
    const history = Array.isArray(result.execution_history)
      ? result.execution_history
      : [];

    // Save the agent's finished execution history.
    for (const [index, item] of history.entries()) {
      const metadata = getHistoryMetadata(item);
      const action = getHistoryMetadata(metadata.action);
      const actionType =
        typeof action.type === "string" ? action.type : "browser action";

      await createExecutionLog({
        runId,
        userId,
        message: `Step ${index + 1}: ${actionType}`,
        metadata,
      });
    }

    if (!result.success) {
      const error =
        result.error || "The agent could not complete the automation.";

      await createExecutionLog({
        runId,
        userId,
        level: "error",
        message: error,
      });

      await failRun(runId, userId, {
        error,
        errorCode: "AGENT_TASK_FAILED",
      });

      return;
    }

    if (result.result !== undefined && result.result !== null) {
      const artifactContent =
        typeof result.result === "object"
          ? result.result
          : { result: result.result };

      await createArtifact({
        runId,
        userId,
        type: "execution_result",
        name: "Automation result",
        content: artifactContent as Record<string, unknown> | unknown[],
        itemCount: Array.isArray(result.result)
          ? result.result.length
          : undefined,
      });
    }

    await createExecutionLog({
      runId,
      userId,
      message: "Automation completed successfully.",
      metadata: {
        stepsCompleted: result.steps_completed ?? history.length,
      },
    });

    await completeRun(runId, userId);
  } catch (error) {
    const message = getErrorMessage(error);

    console.error(`Automation run ${runId} failed:`, error);

    try {
      await createExecutionLog({
        runId,
        userId,
        level: "error",
        message,
      });

      await failRun(runId, userId, {
        error: message,
        errorCode: "EXECUTION_FAILED",
      });
    } catch (persistenceError) {
      console.error(
        `Could not persist failure for run ${runId}:`,
        persistenceError,
      );
    }
  }
}
