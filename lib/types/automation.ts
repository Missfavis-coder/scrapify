
export interface Automation {
    id: string;
    publicId: string;
    userId: string;
    name: string;
    url: string;
    instructions: string;
    description: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface AutomationResponse {
    automation: Automation;
  }
  
  export interface AutomationErrorResponse {
    error?: string;
    message?: string;
  }
  
  export interface AutomationArtifact {
    id: string;
    executionId: string;
    type: string;
    name: string;
    content: unknown;
    storageUrl: string | null;
    itemCount: number | null;
    createdAt: string;
  }
  
 export interface ArtifactResponse {
    artifacts?: AutomationArtifact[];
    error?: string;
    message?: string;
  }