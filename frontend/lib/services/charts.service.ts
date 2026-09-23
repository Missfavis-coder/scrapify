import { apiClient } from "@/lib/api";
import type {
  ChartPeriod,
  SpendingChartResponse,
  TopUpsChartResponse,
  TransfersChartResponse,
} from "@/lib/types/api";

export const chartsService = {
  async getSpending(period: ChartPeriod): Promise<SpendingChartResponse> {
    return apiClient.get<SpendingChartResponse>("/charts/spending", {
      params: { period },
    });
  },

  async getTransfers(period: ChartPeriod): Promise<TransfersChartResponse> {
    return apiClient.get<TransfersChartResponse>("/charts/transfers", {
      params: { period },
    });
  },

  async getTopUps(period: ChartPeriod): Promise<TopUpsChartResponse> {
    return apiClient.get<TopUpsChartResponse>("/charts/topups", {
      params: { period },
    });
  },
};
