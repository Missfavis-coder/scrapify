export type TxKind = "CREDIT" | "DEBIT";
export type TransferType = "NFC" | "QR" | "MANUAL";
export type UserRole = "ADMIN" | "USER";

export interface AnalyticsTransaction {
  id: string;
  type: TxKind;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface AnalyticsTransfer {
  id: string;
  amount: number;
  type: TransferType;
  status: string;
  createdAt: string;
  direction?: "SENT" | "RECEIVED";
}

export interface AnalyticsTopUp {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface AnalyticsUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AnalyticsUserListItem extends AnalyticsUser {
  wallet: { balance: number; currency?: string };
  transferCount: number;
  lastActive: string | null;
}

export interface UserAnalytics {
  wallet: { balance: number; currency: "NGN" };
  transactions: {
    total: number;
    totalCredit: number;
    totalDebit: number;
    thisMonth: number;
    thisMonthCredit: number;
    thisMonthDebit: number;
  };
  transfers: {
    total: number;
    sent: number;
    received: number;
    byType: Record<TransferType, number>;
    thisMonth: number;
  };
  topUps: {
    total: number;
    totalAmount: number;
    thisMonth: number;
    thisMonthAmount: number;
  };
  recentTransactions: AnalyticsTransaction[];
}

export interface AdminAnalytics {
  users: {
    total: number;
    newThisMonth: number;
    newThisWeek: number;
    activeThisMonth: number;
  };
  transactions: {
    total: number;
    totalVolume: number;
    thisMonth: number;
    thisMonthVolume: number;
  };
  transfers: {
    total: number;
    totalVolume: number;
    byType: Record<TransferType, number>;
    thisMonth: number;
  };
  topUps: {
    total: number;
    totalAmount: number;
    thisMonth: number;
    thisMonthAmount: number;
  };
  recentUsers: AnalyticsUser[];
}

export interface AdminUsersListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserDetail {
  user: AnalyticsUser;
  wallet: { balance: number; currency: string };
  transfers: { sent: AnalyticsTransfer[]; received: AnalyticsTransfer[] };
  topUps: AnalyticsTopUp[];
  transactions: AnalyticsTransaction[];
}

export interface UserAnalyticsResponse {
  data: UserAnalytics;
}

export interface AdminAnalyticsResponse {
  data: AdminAnalytics;
}

export interface AdminUsersListResponse {
  data: {
    users: AnalyticsUserListItem[];
    meta: AdminUsersListMeta;
  };
}

export interface AdminUserDetailResponse {
  data: AdminUserDetail;
}

export interface AdminUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}
