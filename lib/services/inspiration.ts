import { apiClient } from "@/lib/api/client";
import {
  INSPIRATION_API_ROUTES,
} from "@/lib/constants/inspiration";
import { DASHBOARD_LIMITS } from "@/lib/constants/dashboard";
import type {
  CreateInspirationFromImageRequest,
  CreateInspirationFromUrlRequest,
  CreateInspirationMergeRequest,
  CreateInspirationResponse,
  InspirationCard,
  InspirationUrlPreviewRequest,
  InspirationUrlPreviewResponse,
  ListInspirationsResponse,
  PresignInspirationImageRequest,
  PresignInspirationImageResponse,
} from "@/lib/types/inspiration";

export interface ListInspirationsInput {
  cursor?: string;
  limit?: number;
}

export const inspirationsService = {
  async list(
    input: ListInspirationsInput = {}
  ): Promise<ListInspirationsResponse> {
    const params = new URLSearchParams();
    if (input.cursor) params.set("cursor", input.cursor);
    params.set(
      "limit",
      String(input.limit ?? DASHBOARD_LIMITS.defaultPageSize)
    );
    const path = `${INSPIRATION_API_ROUTES.list}?${params.toString()}`;
    return apiClient.get<ListInspirationsResponse>(path);
  },

  async getById(id: string): Promise<InspirationCard> {
    return apiClient.get<InspirationCard>(
      `${INSPIRATION_API_ROUTES.list}/${encodeURIComponent(id)}`
    );
  },

  async presignImage(
    input: PresignInspirationImageRequest
  ): Promise<PresignInspirationImageResponse> {
    return apiClient.post<PresignInspirationImageResponse>(
      INSPIRATION_API_ROUTES.presign,
      input
    );
  },

  async createImage(
    input: CreateInspirationFromImageRequest
  ): Promise<CreateInspirationResponse> {
    return apiClient.post<CreateInspirationResponse>(
      INSPIRATION_API_ROUTES.image,
      input
    );
  },

  async createDribbble(
    input: CreateInspirationFromUrlRequest
  ): Promise<CreateInspirationResponse> {
    return apiClient.post<CreateInspirationResponse>(
      INSPIRATION_API_ROUTES.dribbble,
      input
    );
  },

  async createPinterest(
    input: CreateInspirationFromUrlRequest
  ): Promise<CreateInspirationResponse> {
    return apiClient.post<CreateInspirationResponse>(
      INSPIRATION_API_ROUTES.pinterest,
      input
    );
  },

  async createFigma(
    input: CreateInspirationFromUrlRequest
  ): Promise<CreateInspirationResponse> {
    return apiClient.post<CreateInspirationResponse>(
      INSPIRATION_API_ROUTES.figma,
      input
    );
  },

  async createMerge(
    input: CreateInspirationMergeRequest
  ): Promise<CreateInspirationResponse> {
    return apiClient.post<CreateInspirationResponse>(
      INSPIRATION_API_ROUTES.merge,
      input
    );
  },

  async previewUrl(
    input: InspirationUrlPreviewRequest,
    options?: { signal?: AbortSignal }
  ): Promise<InspirationUrlPreviewResponse> {
    const params = new URLSearchParams({ url: input.url, kind: input.kind });
    const path = `${INSPIRATION_API_ROUTES.preview}?${params.toString()}`;
    return apiClient.get<InspirationUrlPreviewResponse>(path, options);
  },

  async uploadToPresignedUrl(
    uploadUrl: string,
    file: File
  ): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });
    if (!response.ok) {
      throw new Error(`Upload failed (status ${response.status})`);
    }
  },
};
