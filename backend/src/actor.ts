import { Actor } from "apify";
import { runDiscovery } from "./services/discovery.service.js";
import { executeWorkflow } from "./services/execution.service.js";
import { createWorkflow, getWorkflowById } from "./services/workflow.service.js";
import { ApifyService } from "./services/apify.service.js";
import { logger } from "./utils/logger.js";
import { db } from "./db/client.js";
import { runs } from "./db/schema.js";

interface ActorInput {
  url?: string;
  taskDescription?: string;
  workflowId?: string;
  inputValues?: Record<string, string>;
}

/**
 * Standalone Apify Actor execution entry point.
 */
export async function main() {
  await Actor.init();

  try {
    const input = (await Actor.getInput<ActorInput>()) || {};
    const {
      url = "https://books.toscrape.com",
      taskDescription = "Extract books and prices with availability",
      workflowId,
      inputValues = {},
    } = input;

    logger.info("Replay Actor started", { input });

    let activeWorkflowId = workflowId;

    if (!activeWorkflowId) {
      // 1. DISCOVERY MODE
      logger.info("Running Discovery Phase on URL", { url, taskDescription });
      const workflowGraph = await runDiscovery(url, taskDescription);

      // Charge PPE event: discovery_completed
      await ApifyService.charge("discovery_completed");

      // Save discovered workflow in DB
      const savedWorkflow = await createWorkflow({
        name: `Workflow for ${new URL(url).hostname}`,
        targetUrl: url,
        taskDescription,
        workflowGraph,
      });

      activeWorkflowId = savedWorkflow.id;
      logger.info("Discovery complete, saved workflow ID", { activeWorkflowId });
    }

    // 2. EXECUTION / REPLAY MODE
    logger.info("Executing Workflow ID", { activeWorkflowId, inputValues });

    // Charge PPE event: workflow_run
    await ApifyService.charge("workflow_run");

    // Create run record in DB
    const [run] = await db
      .insert(runs)
      .values({
        workflowId: activeWorkflowId,
        status: "pending",
        inputValues: inputValues || null,
      })
      .returning();

    // Execute compiled Playwright steps
    const output = await executeWorkflow(activeWorkflowId, run.id, inputValues);

    if (output.status === "success" && output.extractedItems.length > 0) {
      logger.info(`Pushing ${output.extractedItems.length} records to Apify Dataset`);
      await Actor.pushData(output.extractedItems);
    } else {
      logger.warn("Run completed with 0 items or failed", { error: output.error });
      await Actor.pushData({
        status: output.status,
        error: output.error,
        durationMs: output.durationMs,
        stepMetrics: output.stepMetrics,
      });
    }

    logger.info("Replay Actor run finished successfully");
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Replay Actor run error", { error: errorMsg });
    await Actor.fail(errorMsg);
  } finally {
    await Actor.exit();
  }
}

// If executed directly
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
