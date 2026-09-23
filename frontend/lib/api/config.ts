export const getBaseUrl = (): string => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  const normalized = fromEnv ? fromEnv.replace(/\/$/, "") : undefined;
  return normalized || "http://localhost:8000/api/v1";
};

// Socket.io URL for the notifications namespace.
// Prefers NEXT_PUBLIC_NOTIFICATION_WS_URL, otherwise derives from API base URL
// by stripping the path and appending the /notifications namespace.
export const getNotificationSocketUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  try {
    const url = new URL(getBaseUrl());
    return `${url.protocol}//${url.host}/notifications`;
  } catch {
    return "http://localhost:8000/notifications";
  }
};
export const API_ROUTES = {
  health: "/health",

  auth: {
    callback: "/auth/callback",
    logout: "/auth/logout",
    refresh: "/auth/refresh",
  },

  users: {
    profile: "/users/profile",
  },

  wallet: {
    create: "/wallet",
    balance: "/wallet/balance",
    transactions: "/wallet/transactions",
  },

  transfer: {
    initiate: "/transfer/initiate",
    execute: "/transfer/execute",
  },

  payaza: {
    topup: "/payoza/handlTopUp",
    webhook: "/payoza/webhook",
  },

  notifications: {
    list: "/notifications",
    unreadCount: "/notifications/unread/count",
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: "/notifications/read/all",
    delete: (id: string) => `/notifications/${id}`,
  },

  upload: {
    image: "/upload/image",
  },
} as const;