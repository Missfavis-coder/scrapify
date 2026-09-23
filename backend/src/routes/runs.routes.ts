import { Router } from "express";
import { createRunHandler, getRunHandler } from "../controllers/runs.controllers.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { uuidParamSchema, runInputSchema } from "../schemas/workflow.schema.js";

const router: Router = Router();

// POST /workflows/:id/run — execute a saved workflow
router.post(
  "/workflows/:id/run",
  validateRequest({ params: uuidParamSchema, body: runInputSchema }),
  createRunHandler
);

// GET /runs/:id — get run status and results
router.get(
  "/runs/:id",
  validateRequest({ params: uuidParamSchema }),
  getRunHandler
);

export default router;
