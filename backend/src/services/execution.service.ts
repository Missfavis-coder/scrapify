import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { runs, results } from "../db/schema.js";
import { createPage } from "../automation/browser.js";
import {
  navigateAction,
  typeAction,
  clickAction,
  extractAction,
  waitAction,
} from "../automation/actions.js";
import { compileWorkflow } from "./compiler.service.js";
import { getWorkflowById } from "./workflow.service.js";
import { WorkflowGraph } from "../schemas/workflow.schema.js";
import { logger } from "../utils/logger.js";

export interface ExecutionOutput {
  runId: string;
  status: "success" | "failed";
  durationMs: number;
  extractedItems: Record<string, string | null>[];
  stepMetrics: { step: string; action: string; durationMs: number; success: boolean }[];
  error?: string;
}

/**
 * Executes a saved workflow by compiling its graph with inputValues and running Playwright steps.
 */
export async function executeWorkflow(
  workflowId: string,
  runId: string,
  inputValues: Record<string, string> = {}
): Promise<ExecutionOutput> {
  const startTime = Date.now();
  const stepMetrics: { step: string; action: string; durationMs: number; success: boolean }[] = [];
  let extractedItems: Record<string, string | null>[] = [];

  logger.info("Starting workflow execution", { workflowId, runId, inputValues });

  // Update status to 'running'
  await db
    .update(runs)
    .set({ status: "running" })
    .where(eq(runs.id, runId));

  const workflow = await getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error(`Workflow ${workflowId} not found`);
  }

  const graph = workflow.workflowGraph as unknown as WorkflowGraph;
  const compiledSteps = compileWorkflow(graph, inputValues);

  // Use media blocking for maximum replay speed
  const { context, page } = await createPage({ blockMedia: true });

  try {
    for (let i = 0; i < compiledSteps.length; i++) {
      const step = compiledSteps[i];
      const stepName = `Step ${i + 1}: ${step.action} (${step.description || ""})`;

      switch (step.action) {
        case "navigate": {
          const target = step.resolvedUrl || step.url || workflow.targetUrl;
          const res = await navigateAction(page, target);
          stepMetrics.push({ step: stepName, action: step.action, durationMs: res.durationMs, success: res.success });
          if (!res.success) throw new Error(res.error || "Navigation failed");
          break;
        }

        case "search":
        case "type": {
          const textToType = step.resolvedValue || step.value || "";
          const selector = step.selector || "input[type='text']";
          const res = await typeAction(page, selector, textToType);
          stepMetrics.push({ step: stepName, action: step.action, durationMs: res.durationMs, success: res.success });
          if (!res.success) throw new Error(res.error || "Type action failed");
          break;
        }

        case "click": {
          if (step.selector) {
            const res = await clickAction(page, step.selector);
            stepMetrics.push({ step: stepName, action: step.action, durationMs: res.durationMs, success: res.success });
            if (!res.success) throw new Error(res.error || "Click action failed");
          }
          break;
        }

        case "extract": {
          const container = step.selector || "article, .product_pod, .item";
          const fields = step.fields || ["title", "price", "link"];
          const res = await extractAction(page, container, fields);
          stepMetrics.push({ step: stepName, action: step.action, durationMs: res.durationMs, success: res.success });
          if (!res.success) throw new Error(res.error || "Extract action failed");
          extractedItems = res.data || [];
          break;
        }

        case "wait": {
          const res = await waitAction(page, 1000);
          stepMetrics.push({ step: stepName, action: step.action, durationMs: res.durationMs, success: res.success });
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    // Save extracted results in the results table
    await db.insert(results).values({
      runId,
      data: {
        itemCount: extractedItems.length,
        items: extractedItems,
        stepMetrics,
        totalDurationMs: totalDuration,
      },
    });

    // Mark run as success
    await db
      .update(runs)
      .set({
        status: "success",
        completedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    logger.info("Workflow execution completed successfully", {
      runId,
      totalDurationMs: totalDuration,
      itemCount: extractedItems.length,
    });

    return {
      runId,
      status: "success",
      durationMs: totalDuration,
      extractedItems,
      stepMetrics,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Workflow execution failed", { runId, error: errorMsg });

    await db
      .update(runs)
      .set({
        status: "failed",
        completedAt: new Date(),
      })
      .where(eq(runs.id, runId));

    return {
      runId,
      status: "failed",
      durationMs: Date.now() - startTime,
      extractedItems: [],
      stepMetrics,
      error: errorMsg,
    };
  } finally {
    await context.close().catch(() => {});
  }
}
