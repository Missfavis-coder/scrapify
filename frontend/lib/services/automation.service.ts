
import type {
  Automation,
  AutomationArtifact,
  AutomationErrorResponse,
  AutomationResponse,
  ArtifactResponse
} from "@/lib/types/automation";

export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface AutomationRun {
  id: string;
  automationId: string;
  userId: string;
  status: RunStatus;
  stage: string;
  progress: number;
  currentAction: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  errorCode: string | null;
  errorDetail: string | null;
  cancelRequestedAt: string | null;
  createdAt: string;
}

interface RunResponse {
  run?: AutomationRun;
  runs?: AutomationRun[];
  error?: string;
  message?: string;
}

async function readResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  } & T;

  if (!response.ok) {
    throw new Error(data.error || data.message || fallbackMessage);
  }

  return data;
}

async function automationRequest(endpoint: string): Promise<Automation> {
  const response = await fetch(endpoint, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  const data = (await response.json().catch(() => ({}))) as
    Partial<AutomationResponse> & AutomationErrorResponse;

  if (!response.ok) {
    throw new Error(
      data.error || data.message || "Unable to retrieve this automation.",
    );
  }

  if (!data.automation) {
    throw new Error("The automation response did not include an automation.");
  }

  return data.automation;
}

export const automationService = {
  getByPublicId(publicId: string) {
    return automationRequest(
      `/api/automations/${encodeURIComponent(publicId)}`,
    );
  },

  async create(input: {
    url: string;
    instructions: string;
  }): Promise<Automation> {
    const response = await fetch("/api/automations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(input),
    });

    const data = (await response.json().catch(() => ({}))) as
      Partial<AutomationResponse> & AutomationErrorResponse;

    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Failed to create automation.",
      );
    }

    if (!data.automation?.publicId) {
      throw new Error("The server did not return an automation public ID.");
    }

    return data.automation;
  },

  async startRun(publicId: string): Promise<AutomationRun> {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ automationId: publicId }),
    });

    const data = await readResponse<RunResponse>(
      response,
      "Failed to start the automation.",
    );

    if (!data.run) {
      throw new Error("The server did not return the new run.");
    }

    return data.run;
  },

  async getRuns(publicId: string): Promise<AutomationRun[]> {
    const response = await fetch(
      `/api/automations/${encodeURIComponent(publicId)}/runs`,
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      },
    );

    const data = await readResponse<RunResponse>(
      response,
      "Unable to retrieve execution history.",
    );

    if (!Array.isArray(data.runs)) {
      throw new Error("The server did not return execution history.");
    }

    return data.runs;
  },

  async getRun(runId: string): Promise<AutomationRun> {
    const response = await fetch(`/api/run/${encodeURIComponent(runId)}`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });

    const data = await readResponse<RunResponse>(
      response,
      "Unable to retrieve the run.",
    );

    if (!data.run) {
      throw new Error("The server did not return the run.");
    }

    return data.run;
  },

  async getArtifacts(runId: string): Promise<AutomationArtifact[]> {
    const response = await fetch(
      `/api/run/${encodeURIComponent(runId)}/artifacts`,
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      },
    );
  
    const data = (await response.json().catch(() => ({}))) as ArtifactResponse;
  
    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Unable to retrieve generated results.",
      );
    }
  
    return data.artifacts ?? [];
  },
};
