export const CRON_SCHEDULES = {
  reconcileBilling: "0 3 * * *",
  refreshWatchedSources: "*/15 * * * *",
} as const;

export const CRON_PATHS = {
  reconcileBilling: "/api/cron/reconcile-billing",
  refreshWatchedSources: "/api/cron/refresh-watched-sources",
} as const;

export const CRON_AUTH = {
  scheme: "Bearer",
  headerName: "authorization",
} as const;
