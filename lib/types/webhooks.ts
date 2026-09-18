export type WebhookProvider = "slack" | "discord" | "generic";

export interface WebhookConfig {
  id: string;
  userId: string;
  generationId: string;
  target: string;
  provider: WebhookProvider;
  secret: string | null;
  enabled: boolean;
  lastDeliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookInput {
  userId: string;
  generationId: string;
  target: string;
  provider: WebhookProvider;
  secret?: string | null;
  enabled?: boolean;
}

export interface UpdateWebhookInput {
  target?: string;
  provider?: WebhookProvider;
  secret?: string | null;
  enabled?: boolean;
}

export interface WebhookListItem {
  id: string;
  generationId: string;
  provider: WebhookProvider;
  target: string;
  hasSecret: boolean;
  enabled: boolean;
  lastDeliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookListResponse {
  items: WebhookListItem[];
}

export interface SourceChangeDiff {
  generationId: string;
  slug: string | null;
  sourceUrl: string;
  sourceHost: string;
  changedAt: string;
  previousVersion: string | null;
  nextVersion: string | null;
  summary: string;
}

export interface SkillSummaryV1 {
  id: string;
  slug: string | null;
  sourceUrl: string;
  sourceHost: string;
  mode: string;
  isPublic: boolean;
  isInspiration: boolean;
  createdAt: string;
  updatedAt: string;
  name: string | null;
  description: string | null;
}

export interface PaginatedV1Response<T> {
  items: T[];
  nextCursor: string | null;
}
