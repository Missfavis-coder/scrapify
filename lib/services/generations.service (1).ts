import { apiClient } from "@/lib/api";
import type { AdminSkillDeleteResponse } from "@/lib/types/admin";
import type {
  ArchiveGenerationDto,
  ArchiveGenerationResponse,
  CreateGenerationDto,
  CreateGenerationResponse,
  CrawledPagesResponse,
  DeleteGenerationResponse,
  GenerationWithArtifacts,
  ImproveGenerationDto,
  ImproveGenerationResponse,
  UpdateVisibilityDto,
  UpdateVisibilityResponse,
} from "@/lib/types/generation";

export const generationsService = {
  async create(data: CreateGenerationDto): Promise<CreateGenerationResponse> {
    return apiClient.post<CreateGenerationResponse>("/api/generate", data);
  },

  async getById(id: string): Promise<GenerationWithArtifacts> {
    return apiClient.get<GenerationWithArtifacts>(`/api/generations/${id}`);
  },

  async getPages(id: string): Promise<CrawledPagesResponse> {
    return apiClient.get<CrawledPagesResponse>(`/api/generations/${id}/pages`);
  },

  async setVisibility(
    id: string,
    data: UpdateVisibilityDto
  ): Promise<UpdateVisibilityResponse> {
    return apiClient.post<UpdateVisibilityResponse>(
      `/api/generations/${id}/visibility`,
      data
    );
  },

  async recordView(id: string): Promise<{ id: string; viewCount: number }> {
    return apiClient.post<{ id: string; viewCount: number }>(
      `/api/generations/${id}/view`,
      {}
    );
  },

  async retry(id: string): Promise<{ id: string; status: "pending" }> {
    return apiClient.post<{ id: string; status: "pending" }>(
      `/api/generations/${id}/retry`,
      {}
    );
  },

  async improve(
    id: string,
    data: ImproveGenerationDto
  ): Promise<ImproveGenerationResponse> {
    return apiClient.post<ImproveGenerationResponse>(
      `/api/generations/${id}/improve`,
      data
    );
  },

  async submitFeedback(
    id: string,
    data: { feedback: string }
  ): Promise<{ id: string; ok: true }> {
    return apiClient.post<{ id: string; ok: true }>(
      `/api/generations/${id}/feedback`,
      data
    );
  },

  async archive(
    id: string,
    data: ArchiveGenerationDto
  ): Promise<ArchiveGenerationResponse> {
    return apiClient.post<ArchiveGenerationResponse>(
      `/api/generations/${id}/archive`,
      data
    );
  },

  async remove(id: string): Promise<DeleteGenerationResponse> {
    return apiClient.del<DeleteGenerationResponse>(`/api/generations/${id}`);
  },

  async adminRemove(id: string): Promise<AdminSkillDeleteResponse> {
    return apiClient.del<AdminSkillDeleteResponse>(`/api/admin/skills/${id}`);
  },
};
