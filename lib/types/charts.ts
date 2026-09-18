export type ChartPeriod = "7d" | "30d" | "90d" | "1y";

export interface SeriesPoint {
  date: string;
  amount: number;
}

export interface SpendingChartResponse {
  data: {
    period?: string;
    inflow: SeriesPoint[];
    outflow: SeriesPoint[];
    netFlow?: SeriesPoint[];
    summary: {
      totalInflow: number;
      totalOutflow: number;
      netFlow: number;
    };
  };
}

export interface TransfersTrendPoint {
  date: string;
  count: number;
  volume: number;
}

export interface TransfersChartResponse {
  data: {
    period?: string;
    byType: {
      NFC: number;
      QR: number;
      MANUAL: number;
    };
    byStatus?: Record<string, number>;
    trend?: TransfersTrendPoint[];
  };
}

export interface TopUpsTrendPoint {
  date: string;
  amount: number;
}

export interface TopUpsChartResponse {
  data: {
    period: string;
    trend: TopUpsTrendPoint[];
    summary: {
      totalAmount: number;
      count: number;
    };
  };
}

export type StatementFormat = "pdf" | "csv";
export type StatementType = "all" | "transfers" | "topups";

export interface StatementExportParams {
  format: StatementFormat;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  type: StatementType;
}

export type SupportContactType = "live_chat" | "email";

export interface SupportContactPayload {
  type: SupportContactType;
  subject: string;
  message: string;
}

export interface SupportContactResponse {
  success?: boolean;
  message?: string;
  ticketId?: string;
}

export interface ReportFraudPayload {
  subject: string;
  description: string;
  transactionReference?: string;
}

export interface ReportFraudResponse {
  success?: boolean;
  message?: string;
  reportId?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
