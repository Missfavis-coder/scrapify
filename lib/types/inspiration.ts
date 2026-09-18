import type {
  GenerationMode,
  GenerationStatus,
  SourceKind,
} from "@/lib/types/generation";

export type InspirationSource =
  | "image"
  | "dribbble"
  | "pinterest"
  | "figma"
  | "merge";

export interface InspirationGeneration {
  id: string;
  userId: string;
  sourceUrl: string;
  sourceHost: string;
  sourceKind: SourceKind;
  mode: GenerationMode;
  status: GenerationStatus;
  inspirationImageKey: string | null;
  inspirationParentIds: string[] | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface InspirationCard {
  id: string;
  sourceKind: InspirationSource;
  sourceUrl: string;
  sourceHost: string;
  mode: GenerationMode;
  status: GenerationStatus;
  createdAt: string;
  screenshotAbove: string | null;
  skillName: string | null;
  skillDescription: string | null;
  palette: string[];
  inspirationParentIds: string[] | null;
}

export interface CreateInspirationInput {
  id: string;
  userId: string;
  ipHash: string;
  sourceUrl: string;
  sourceHost: string;
  sourceKind: SourceKind;
  mode: GenerationMode;
  inspirationImageKey?: string | null;
  inspirationParentIds?: string[] | null;
}

export interface ListInspirationsOptions {
  cursor?: string | null;
  limit?: number | null;
}

export interface PresignInspirationImageRequest {
  contentType: string;
  contentLength: number;
}

export interface PresignInspirationImageResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

export interface CreateInspirationFromImageRequest {
  imageKey: string;
  mode?: GenerationMode;
}

export interface CreateInspirationFromUrlRequest {
  url: string;
  mode?: GenerationMode;
}

export interface CreateInspirationMergeRequest {
  sourceIds: string[];
  prompt?: string;
}

export interface CreateInspirationResponse {
  generationId: string;
}

export type InspirationUrlPreviewKind = "dribbble" | "pinterest" | "figma";

export interface InspirationUrlPreviewRequest {
  url: string;
  kind: InspirationUrlPreviewKind;
}

export interface InspirationUrlPreviewResponse {
  imageUrl: string;
  pageTitle: string | null;
  finalUrl: string;
}

export interface ListInspirationsResponse {
  items: InspirationCard[];
  nextCursor: string | null;
}

export type V1CreateInspirationBody =
  | { source: "image"; payload: CreateInspirationFromImageRequest }
  | { source: "dribbble"; payload: CreateInspirationFromUrlRequest }
  | { source: "pinterest"; payload: CreateInspirationFromUrlRequest }
  | { source: "figma"; payload: CreateInspirationFromUrlRequest }
  | { source: "merge"; payload: CreateInspirationMergeRequest };
