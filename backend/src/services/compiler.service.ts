import { WorkflowGraph, WorkflowStep } from "../schemas/workflow.schema.js";
import { logger } from "../utils/logger.js";

export interface CompiledStep extends WorkflowStep {
  resolvedUrl?: string;
  resolvedValue?: string;
}

/**
 * Compiles a WorkflowGraph by injecting runtime parameters into step templates (e.g. {{query}}).
 */
export function compileWorkflow(
  graph: WorkflowGraph,
  inputValues: Record<string, string> = {}
): CompiledStep[] {
  logger.info("Compiling workflow graph", { inputValues, stepCount: graph.steps.length });

  return graph.steps.map((step) => {
    const compiled: CompiledStep = { ...step };

    // Resolve URL templates
    if (compiled.url) {
      compiled.resolvedUrl = resolveTemplate(compiled.url, inputValues);
    }

    // Resolve Value templates (for search / typing)
    if (compiled.value) {
      compiled.resolvedValue = resolveTemplate(compiled.value, inputValues);
    }

    return compiled;
  });
}

function resolveTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    return values[key] !== undefined ? values[key] : `{{${key}}}`;
  });
}
