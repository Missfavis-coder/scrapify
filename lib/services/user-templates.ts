import { apiClient } from "@/lib/api/client";
import type { UserTemplate } from "@/lib/types/user-templates";

const PATH = "/api/account/templates";

export interface CreateUserTemplateInput {
  slug: string;
  repoUrl: string;
  branch?: string | null;
  description?: string | null;
}

export interface ListUserTemplatesResponse {
  items: UserTemplate[];
}

export const userTemplatesService = {
  async list(): Promise<ListUserTemplatesResponse> {
    return apiClient.get<ListUserTemplatesResponse>(PATH);
  },
  async create(input: CreateUserTemplateInput): Promise<UserTemplate> {
    return apiClient.post<UserTemplate>(PATH, input);
  },
  async remove(id: string): Promise<{ ok: true }> {
    const path = `${PATH}/${encodeURIComponent(id)}`;
    return apiClient.del<{ ok: true }>(path);
  },
};
