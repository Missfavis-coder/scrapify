import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { getBaseUrl } from "./config";
import { ApiError, ErrorResponse, RequestConfig } from "./types";
import { isApiResponse } from "./utils";
import { interceptorManager } from "./interceptors";
import { authService } from "@/lib/services/auth.service";

const DEFAULT_TIMEOUT = 30000;

// Token storage keys
const ACCESS_TOKEN_KEY = "nfc_access_token";
const REFRESH_TOKEN_KEY = "nfc_refresh_token";

// Token management functions
export const tokenStorage = {
  getAccessToken: (): string | null => {
    // Option 1: Memory storage (most secure but lost on refresh)
    if (typeof window !== "undefined") {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  },
  
  setAccessToken: (token: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
  },

  setRefreshToken: (token: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  },
  
  getRefreshToken: (): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(REFRESH_TOKEN_KEY);

    }
    return null;
  },
  
  
  clearTokens: (): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
};

const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: DEFAULT_TIMEOUT,
});

// Request interceptor to add token to headers
axiosInstance.interceptors.request.use(
  async (config) => {
    const requestConfig: RequestConfig = {
      headers: config.headers as Record<string, string>,
      method: config.method,
      timeout: config.timeout,
      signal: config.signal as AbortSignal | undefined,
    };

    const processedConfig =
      await interceptorManager.applyRequestInterceptors(requestConfig);

    if (processedConfig.headers) {
      Object.assign(config.headers, processedConfig.headers);
    }

    // Add access token to headers if available
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/login"
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

function redirectToLogin(): void {
  if (typeof window === "undefined") return;

  if (isPublicRoute(window.location.pathname)) {
    tokenStorage.clearTokens();
    return;
  }

  tokenStorage.clearTokens();

  const loginUrl = new URL("/auth/login", window.location.origin);
  loginUrl.searchParams.set(
    "redirect",
    window.location.pathname + window.location.search,
  );
  window.location.href = loginUrl.toString();
}

axiosInstance.interceptors.response.use(
  async (response: AxiosResponse) => {
    let data = response.data;

    if (isApiResponse(data)) {
      data = data.data;

      if (data?.success === false) {
        throw new ApiError(
          data.message || "Request failed",
          response.status,
          data
        );
      }
    }

    const processedData = await interceptorManager.applyResponseInterceptors(
      response,
      data,
    );
    response.data = processedData;

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response) {
      const response = error.response;
      const data = response.data as ErrorResponse;

      const message =
        data?.message || `Request failed with status ${response.status}`;

      const apiError = new ApiError(message, response.status, data);
      const processedError =
        await interceptorManager.applyErrorInterceptors(apiError);

        if (
          processedError.status === 401 &&
          originalRequest &&
          !(originalRequest as any)._retry
        ) {
          const isRefreshRequest =
            originalRequest.url?.includes("/auth/refresh");
        
          if (isRefreshRequest) {
            redirectToLogin();
            return Promise.reject(processedError);
          }
        
          (originalRequest as any)._retry = true;
        
          const refreshToken = tokenStorage.getRefreshToken();
        
          if (!refreshToken) {
            redirectToLogin();
            return Promise.reject(processedError);
          }
        
          const retryRequest = () => {
            const newAccessToken = tokenStorage.getAccessToken();
        
            if (newAccessToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
        
            return axiosInstance.request(originalRequest);
          };
        
          if (isRefreshing && refreshPromise) {
            return refreshPromise.then((token) => {
              if (token) return retryRequest();
              redirectToLogin();
              throw processedError;
            });
          }
        
          isRefreshing = true;
        
          refreshPromise = authService.refreshToken().then(
            (result) => {
              isRefreshing = false;
              refreshPromise = null;
        
              if (result?.accessToken) {
                tokenStorage.setAccessToken(result.accessToken);
                if (result.refreshToken) {
                  tokenStorage.setRefreshToken(result.refreshToken);
                }
                return result.accessToken;
              }
        
              redirectToLogin();
              return null;
            },
            (error) => {
              isRefreshing = false;
              refreshPromise = null;
        
              redirectToLogin(); 
              return Promise.reject(error);
            }
          );
        
          return refreshPromise.then((token) => {
            if (token) return retryRequest();
            redirectToLogin();
            throw processedError;
          });
        }
      throw processedError;
    }

    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      throw new ApiError("Request timeout", 408);
    }

    throw new ApiError(error.message || "Network error", 0);
  },
);

async function request<T>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<T> {
  const headers = config.headers || {};

  const axiosConfig: AxiosRequestConfig = {
    url: endpoint,
    method: config.method || "GET",
    headers,
    params: config.params,
    timeout: config.timeout,
    signal: config.signal,
    _retry: (config as any)._retry,
  };

  if (config.body) {
    if (
      config.body instanceof FormData ||
      config.body instanceof URLSearchParams
    ) {
      axiosConfig.data = config.body;
    } else {
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      if (typeof config.body === "string") {
        try {
          axiosConfig.data = JSON.parse(config.body);
        } catch {
          axiosConfig.data = config.body;
        }
      } else {
        axiosConfig.data = config.body;
      }
    }
  } else if (axiosConfig.method !== "GET" && axiosConfig.method !== "DELETE") {
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const response = await axiosInstance.request<T>(axiosConfig);

  const resData: any = response.data;

  if (resData?.success === false) {
    throw new ApiError(resData.message || "Request failed", 400);
  }

  return response.data;
}

export const apiClient = {
  get: <T>(endpoint: string, options: RequestConfig = {}) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options: RequestConfig = {}) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body,
    }),

  put: <T>(endpoint: string, body?: unknown, options: RequestConfig = {}) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body,
    }),

  patch: <T>(endpoint: string, body?: unknown, options: RequestConfig = {}) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body,
    }),

  delete: <T>(endpoint: string, options: RequestConfig = {}) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

export type {
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
} from "./types";
export { ApiError } from "./types";
export {
  addRequestInterceptor,
  addResponseInterceptor,
  addErrorInterceptor,
} from "./interceptors";

export function resetTokenRefreshQueue(): void {
  isRefreshing = false;
  refreshPromise = null;
}

// Helper function to set tokens after login
export function setAuthTokens(accessToken: string, refreshToken: string): void {
  tokenStorage.setAccessToken(accessToken);
  tokenStorage.setRefreshToken(refreshToken);
}

// Helper function to clear tokens on logout
export function clearAuthTokens(): void {
  tokenStorage.clearTokens();
}