import { apiClient } from "@/lib/api";
import type {
  DashboardOverviewParams,
  DashboardOverviewResponse,
  TransactionsParams,
  TransactionsResponse,
  NotificationsParams,
  NotificationsResponse,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  UnreadCountResponse,
  WalletBalanceResponse,
} from "@/lib/types/api";

export const dashboardService = {

  dashboard: {
    async getOverview(
      params?: DashboardOverviewParams
    ): Promise<DashboardOverviewResponse> {
      return apiClient.get("/health", { params });
    },
  },

  wallet: {
    async createWallet() {
      return apiClient.post("/wallet");
    },

    async getBalance(): Promise<WalletBalanceResponse> {
      return apiClient.get("/wallet/balance");
    },

    async getTransactions(
      params?: TransactionsParams
    ): Promise<TransactionsResponse> {
      return apiClient.get("/wallet/transactions", { params });
    },
  },

  transfer: {
    async initiate(data: any) {
      return apiClient.post("/transfer/initiate", data);
    },

    async execute(data: any) {
      return apiClient.post("/transfer/execute", data);
    },
  },

  payaza: {
    async handleTopUp(data: any) {
      return apiClient.post("/payoza/handlTopUp", data);
    },

    async webhook(data: any) {
      return apiClient.post("/payoza/webhook", data);
    },
  },


  notifications: {
    async getList(
      params?: NotificationsParams
    ): Promise<NotificationsResponse> {
      return apiClient.get("/notifications", { params });
    },

    async getUnreadCount(): Promise<UnreadCountResponse> {
      return apiClient.get<UnreadCountResponse>("/notifications/unread/count");
    },

    async markAsRead(id: string): Promise<MarkNotificationReadResponse> {
      return apiClient.put(`/notifications/${id}/read`);
    },

    async markAllAsRead(): Promise<MarkAllNotificationsReadResponse> {
      return apiClient.put("/notifications/read/all");
    },

    async deleteNotification(id: string) {
      return apiClient.delete(`/notifications/${id}`);
    },
  },
};