import { z } from "zod";

// Individual workflow step actions
export const workflowStepSchema = z.object({
  action: z.enum([
    "navigate",
    "search",
    "filter",
    "extract",
    "click",
    "type",
    "wait",
  ]),
  // Target selector for the element (CSS selector or aria-based)
  selector: z.string().optional(),
  // URL for navigate actions
  url: z.string().optional(),
  // Value to type/search — can be a template like {{query}}
  value: z.string().optional(),
  // Field name for filter actions
  field: z.string().optional(),
  // Fields to extract (for extract actions)
  fields: z.array(z.string()).optional(),
  // Human-readable description of what this step does
  description: z.string().optional(),
});

export type WorkflowStep = z.infer<typeof workflowStepSchema>;

// The full workflow graph stored in the DB
export const workflowGraphSchema = z.object({
  steps: z.array(workflowStepSchema).min(1, "Workflow must have at least one step"),
  // Parameters that can be substituted at runtime (e.g. ["query", "maxPrice"])
  parameters: z.array(z.string()).default([]),
});

export type WorkflowGraph = z.infer<typeof workflowGraphSchema>;

// Input values for running a workflow (e.g. { query: "laptops", maxPrice: "800" })
export const runInputSchema = z.object({
  inputValues: z.record(z.string(), z.string()).optional(),
});

export type RunInput = z.infer<typeof runInputSchema>;

// UUID param validation (reusable for :id routes)
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});
