import { createPage } from "../automation/browser.js";
import { navigateAction } from "../automation/actions.js";
import { discoverPageElements } from "../automation/discover.js";
import { WorkflowGraph } from "../schemas/workflow.schema.js";
import { logger } from "../utils/logger.js";

/**
 * Orchestrates the full discovery flow:
 * 1. Opens the browser page
 * 2. Navigates to target URL
 * 3. Discovers the DOM structure and task-relevant elements
 * 4. Compiles and returns the structured WorkflowGraph
 */
export async function runDiscovery(
  targetUrl: string,
  taskDescription: string
): Promise<WorkflowGraph> {
  logger.info("Starting discovery service", { targetUrl, taskDescription });
  const start = Date.now();

  const { context, page } = await createPage();

  try {
    // Navigate to page
    const navResult = await navigateAction(page, targetUrl);
    if (!navResult.success) {
      throw new Error(`Failed to navigate to target URL: ${navResult.error}`);
    }

    // Discover elements based on task intent
    const { steps, parameters } = await discoverPageElements(page, taskDescription);

    const workflowGraph: WorkflowGraph = {
      steps,
      parameters,
    };

    logger.info("Discovery completed successfully", {
      durationMs: Date.now() - start,
      stepCount: steps.length,
      parameters,
    });

    return workflowGraph;
  } finally {
    await context.close().catch(() => {});
  }
}
