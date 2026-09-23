import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";

// Route imports
import healthRoutes from "./routes/health.routes.js";
import workflowRoutes from "./routes/workflows.routes.js";
import runsRoutes from "./routes/runs.routes.js";

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
  });
  next();
});

// --- Routes ---
app.use("/health", healthRoutes);
app.use("/workflows", workflowRoutes);
app.use("/", runsRoutes); // Handles /workflows/:id/run and /runs/:id

// --- Global Error Handler (must be last) ---
app.use(errorHandler);

export default app;