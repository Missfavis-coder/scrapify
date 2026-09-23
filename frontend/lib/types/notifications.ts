export type NotificationType = "CREDIT" | "DEBIT" | "ALERT";

export interface NotificationMeta {
  amount?: number;
  senderId?: string;
  receiverId?: string;
  transferType?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  metaData?: NotificationMeta;
}

export interface NotificationsParams {
  page?: number;
  limit?: number;
}

export interface NotificationsListPayload {
  notifications: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    unreadCount: number;
  };
}

export interface NotificationsResponse {
  data: NotificationsListPayload;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkNotificationReadResponse {
  success?: boolean;
  message?: string;
}

export interface MarkAllNotificationsReadResponse {
  success?: boolean;
  message?: string;
  count?: number;
}
