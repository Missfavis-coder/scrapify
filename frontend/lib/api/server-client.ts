import { getBaseUrl } from "./config";

interface ServerRequestConfig {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

class ServerApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ServerApiError";
  }
}

async function serverRequest<T>(
  endpoint: string,
  accessToken: string,
  config: ServerRequestConfig = {}
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...config.headers,
  };

  const fetchConfig: RequestInit = {
    method: config.method || "GET",
    headers,
  };

  if (config.body && config.method !== "GET") {
    fetchConfig.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, fetchConfig);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.message || `Request failed with status ${response.status}`;
    throw new ServerApiError(message, response.status, errorData);
  }

  const data = await response.json();
  return data.data || data;
}

export const serverApiClient = {
  get: <T>(endpoint: string, accessToken: string, config: ServerRequestConfig = {}) =>
    serverRequest<T>(endpoint, accessToken, { ...config, method: "GET" }),

  post: <T>(
    endpoint: string,
    accessToken: string,
    body?: unknown,
    config: ServerRequestConfig = {}
  ) =>
    serverRequest<T>(endpoint, accessToken, {
      ...config,
      method: "POST",
      body,
    }),

  put: <T>(
    endpoint: string,
    accessToken: string,
    body?: unknown,
    config: ServerRequestConfig = {}
  ) =>
    serverRequest<T>(endpoint, accessToken, {
      ...config,
      method: "PUT",
      body,
    }),

  patch: <T>(
    endpoint: string,
    accessToken: string,
    body?: unknown,
    config: ServerRequestConfig = {}
  ) =>
    serverRequest<T>(endpoint, accessToken, {
      ...config,
      method: "PATCH",
      body,
    }),

  delete: <T>(endpoint: string, accessToken: string, config: ServerRequestConfig = {}) =>
    serverRequest<T>(endpoint, accessToken, { ...config, method: "DELETE" }),
};

export { ServerApiError };
