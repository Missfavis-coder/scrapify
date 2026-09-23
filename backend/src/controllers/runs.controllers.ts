import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { runs, results } from "../db/schema.js";
import { getWorkflowById } from "../services/workflow.service.js";
import { executeWorkflow } from "../services/execution.service.js";
import { logger } from "../utils/logger.js";
import type { AppError } from "../middleware/errorHandler.js";

/**
 * POST /workflows/:id/run
 * Creates a new run for a saved workflow, executes Playwright compiled steps, and returns structured data.
 */
export async function createRunHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workflowId = req.params.id as string;
    const { inputValues } = req.body || {};

    // Verify workflow exists
    const workflow = await getWorkflowById(workflowId);
    if (!workflow) {
      const err: AppError = new Error("Workflow not found");
      err.statusCode = 404;
      throw err;
    }

    logger.info("Creating run", { workflowId, inputValues });

    // 1. Create the pending run record
    const [run] = await db
      .insert(runs)
      .values({
        workflowId,
        status: "pending",
        inputValues: inputValues || null,
      })
      .returning();

    // 2. Execute the workflow synchronously (or streamable) for immediate response
    const executionOutput = await executeWorkflow(
      workflowId,
      run.id,
      inputValues || {}
    );

    // 3. Fetch latest run and results records
    const [latestRun] = await db.select().from(runs).where(eq(runs.id, run.id));
    const latestResults = await db.select().from(results).where(eq(results.runId, run.id));

    res.status(201).json({
      success: executionOutput.status === "success",
      data: {
        run: latestRun,
        executionMetrics: {
          durationMs: executionOutput.durationMs,
          itemCount: executionOutput.extractedItems.length,
          stepMetrics: executionOutput.stepMetrics,
        },
        results: latestResults,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /runs/:id
 * Returns a run's status and results.
 */
export async function getRunHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;

    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.id, id));

    if (!run) {
      const err: AppError = new Error("Run not found");
      err.statusCode = 404;
      throw err;
    }

    // Fetch associated results
    const runResults = await db
      .select()
      .from(results)
      .where(eq(results.runId, id));

    res.json({
      success: true,
      data: {
        run,
        results: runResults,
      },
    });
  } catch (err) {
    next(err);
  }
}
