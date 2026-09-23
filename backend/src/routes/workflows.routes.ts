import { Router } from "express";
import {
  createWorkflowHandler,
  listWorkflowsHandler,
  getWorkflowHandler,
} from "../controllers/workflow.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createTaskSchema } from "../schemas/task.schema.js";
import { uuidParamSchema } from "../schemas/workflow.schema.js";

const router: Router = Router();

// POST /workflows — discover + save a new workflow
router.post(
  "/",
  validateRequest({ body: createTaskSchema }),
  createWorkflowHandler
);

// GET /workflows — list all saved workflows
router.get("/", listWorkflowsHandler);

// GET /workflows/:id — get a specific workflow
router.get(
  "/:id",
  validateRequest({ params: uuidParamSchema }),
  getWorkflowHandler
);

export default router;
