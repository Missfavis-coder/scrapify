import { apiClient } from "@/lib/api";
import type {
  AdminAnalyticsResponse,
  AdminUserDetailResponse,
  AdminUsersListResponse,
  AdminUsersParams,
  UserAnalyticsResponse,
} from "@/lib/types/api";

export const analyticsService = {
  async getMine(): Promise<UserAnalyticsResponse> {
    return apiClient.get<UserAnalyticsResponse>("/analytics/me");
  },

  async getAdmin(): Promise<AdminAnalyticsResponse> {
    return apiClient.get<AdminAnalyticsResponse>("/analytics/admin");
  },

  async getAdminUsers(
    params?: AdminUsersParams,
  ): Promise<AdminUsersListResponse> {
    return apiClient.get<AdminUsersListResponse>("/analytics/admin/users", {
      params,
    });
  },

  async getAdminUser(userId: string): Promise<AdminUserDetailResponse> {
    return apiClient.get<AdminUserDetailResponse>(
      `/analytics/admin/users/${userId}`,
    );
  },
};
