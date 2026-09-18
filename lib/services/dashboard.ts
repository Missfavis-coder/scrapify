import { apiClient } from "@/lib/api/client";
import { DASHBOARD_LIMITS } from "@/lib/constants/dashboard";
import type {
  DashboardGeneration,
  DashboardProject,
  PaginatedResponse,
} from "@/lib/types/dashboard";

const PROJECTS_PATH = "/api/dashboard/projects";
const GENERATIONS_PATH = "/api/dashboard/generations";
const ARCHIVED_PATH = "/api/dashboard/generations/archived";

export interface ListDashboardInput {
  cursor?: string;
  limit?: number;
}

function buildPath(base: string, input: ListDashboardInput): string {
  const params = new URLSearchParams();
  if (input.cursor) params.set("cursor", input.cursor);
  params.set("limit", String(input.limit ?? DASHBOARD_LIMITS.defaultPageSize));
  return `${base}?${params.toString()}`;
}

export const dashboardService = {
  async listProjects(
    input: ListDashboardInput = {}
  ): Promise<PaginatedResponse<DashboardProject>> {
    return apiClient.get<PaginatedResponse<DashboardProject>>(
      buildPath(PROJECTS_PATH, input)
    );
  },

  async listGenerations(
    input: ListDashboardInput = {}
  ): Promise<PaginatedResponse<DashboardGeneration>> {
    return apiClient.get<PaginatedResponse<DashboardGeneration>>(
      buildPath(GENERATIONS_PATH, input)
    );
  },

  async listArchivedGenerations(
    input: ListDashboardInput = {}
  ): Promise<PaginatedResponse<DashboardGeneration>> {
    return apiClient.get<PaginatedResponse<DashboardGeneration>>(
      buildPath(ARCHIVED_PATH, input)
    );
  },
};
