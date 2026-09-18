export type Period = "7d" | "30d" | "90d";
export type CreditPeriod = "day" | "week" | "month";
export type NotificationStatus = "success" | "error" | "pending";
export type ReferralStatus = "pending" | "completed" | "expired";
export type SupportCategory = "billing" | "technical" | "integrations" | "other";

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}
