
export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type PipelineStage =
  | "queued"
  | "starting"
  | "navigating"
  | "planning"
  | "executing"
  | "extracting"
  | "verifying"
  | "saving"
  | "completed"
  | "failed"
  | "cancelled";

export interface PipelineProgress {
  stage: PipelineStage;
  progress: number;
  currentAction: string | null;
}

export interface PipelineInput {
  runId: string;
  automationId: string;
  userId: string;
  url: string;
  instructions: string;
}

export interface PipelineResult {
  status: Extract<RunStatus, "completed" | "failed" | "cancelled">;
  artifactIds: string[];
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}
