import { Request, Response, NextFunction } from "express";
import {
  createWorkflow,
  getAllWorkflows,
  getWorkflowById,
} from "../services/workflow.service.js";
import { runDiscovery } from "../services/discovery.service.js";
import { logger } from "../utils/logger.js";
import type { CreateTaskInput } from "../schemas/task.schema.js";
import type { AppError } from "../middleware/errorHandler.js";

/**
 * POST /workflows
 * Accepts a URL + task description, runs live discovery via Playwright, and saves the resulting workflow.
 */
export async function createWorkflowHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { url, taskDescription, name } = req.body as CreateTaskInput;

    logger.info("Executing discovery for new workflow", { url, taskDescription });
    const workflowGraph = await runDiscovery(url, taskDescription);

    const workflow = await createWorkflow({
      name: name || `Workflow for ${new URL(url).hostname}`,
      targetUrl: url,
      taskDescription,
      workflowGraph,
    });

    res.status(201).json({
      success: true,
      data: workflow,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /workflows
 * Returns all saved workflows.
 */
export async function listWorkflowsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const workflowsList = await getAllWorkflows();
    res.json({
      success: true,
      data: workflowsList,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /workflows/:id
 * Returns a single workflow by ID, or 404.
 */
export async function getWorkflowHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params.id as string;
    const workflow = await getWorkflowById(id);

    if (!workflow) {
      const err: AppError = new Error("Workflow not found");
      err.statusCode = 404;
      throw err;
    }

    res.json({
      success: true,
      data: workflow,
    });
  } catch (err) {
    next(err);
  }
}
