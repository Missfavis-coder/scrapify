import { ApiResponse, ErrorResponse } from "./types";

export const isFormData = (body: unknown): body is FormData => {
  return typeof FormData !== "undefined" && body instanceof FormData;
};

export const isUrlEncoded = (body: unknown): body is URLSearchParams => {
  return typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
};

export const normalizeHeaders = (headers?: HeadersInit): Record<string, string> => {
  const headersObj: Record<string, string> = {};

  if (!headers) return headersObj;

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      headersObj[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      headersObj[key] = value;
    });
  } else {
    Object.assign(headersObj, headers);
  }

  return headersObj;
};

export const buildHeaders = (
  initHeaders?: HeadersInit,
  body?: BodyInit
): Record<string, string> => {
  const headers = normalizeHeaders(initHeaders);

  if (!isFormData(body) && !isUrlEncoded(body)) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

export const createTimeoutSignal = (timeout: number): AbortSignal => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
};

export const combineAbortSignals = (signals: AbortSignal[]): AbortSignal => {
  const controller = new AbortController();
  signals.forEach((signal) => {
    signal.addEventListener("abort", () => controller.abort());
  });
  return controller.signal;
};

export const parseJsonSafe = async <T>(response: Response): Promise<T | undefined> => {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return undefined;

  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

export const isApiResponse = <T>(data: unknown): data is ApiResponse<T> => {
  if (typeof data !== 'object' || data === null) return false;
  
  const obj = data as Record<string, unknown>;
  
  if (!('success' in obj) || !('data' in obj)) return false;
  
  const apiResponseFields = ['success', 'data', 'timestamp'];
  const keys = Object.keys(obj);
  
  return keys.every(key => apiResponseFields.includes(key));
};

export const serializeBody = (body?: unknown): BodyInit | undefined => {
  if (!body) return undefined;
  if (isFormData(body) || isUrlEncoded(body)) return body;
  return JSON.stringify(body);
};
