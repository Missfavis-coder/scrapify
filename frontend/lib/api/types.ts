import { AxiosResponse } from "axios";

export interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, unknown> | object;
  timeout?: number;
  signal?: AbortSignal;
  _retry?: boolean;
}

export type RequestInterceptor = (
  config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;
export type ResponseInterceptor = <T>(
  response: AxiosResponse,
  data: T
) => T | Promise<T>;
export type ErrorInterceptor = (
  error: ApiError
) => ApiError | Promise<ApiError>;

export interface ErrorResponse {
  message?: string;
  error?: Record<string, unknown> | string;
}

export class ApiError<T = unknown> extends Error {
  status: number;
  data?: T;

  constructor(message: string, status: number, data?: T) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp?: string;
}

declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}
