import { apiClient } from "@/lib/api/client";
import { DASHBOARD_LIMITS } from "@/lib/constants/dashboard";
import type {
  BookmarkToggleResponse,
  BookmarkWithGeneration,
  PaginatedResponse,
} from "@/lib/types/dashboard";

const BOOKMARKS_PATH = "/api/bookmarks";

export interface ToggleBookmarkInput {
  generationId: string;
}

export interface ListBookmarksInput {
  cursor?: string;
  limit?: number;
}

export const bookmarksService = {
  async toggle(input: ToggleBookmarkInput): Promise<BookmarkToggleResponse> {
    return apiClient.post<BookmarkToggleResponse>(BOOKMARKS_PATH, input);
  },

  async list(
    input: ListBookmarksInput = {}
  ): Promise<PaginatedResponse<BookmarkWithGeneration>> {
    const params = new URLSearchParams();
    if (input.cursor) params.set("cursor", input.cursor);
    params.set(
      "limit",
      String(input.limit ?? DASHBOARD_LIMITS.defaultPageSize)
    );
    const path = `${BOOKMARKS_PATH}?${params.toString()}`;
    return apiClient.get<PaginatedResponse<BookmarkWithGeneration>>(path);
  },
};
