import { AxiosResponse } from 'axios';
import { ApiError, ErrorInterceptor, RequestConfig, RequestInterceptor, ResponseInterceptor } from "./types";
import { getCookie } from "cookies-next";
import { normalizeHeaders } from "./utils";

class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  async applyRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let finalConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }
    return finalConfig;
  }

  async applyResponseInterceptors<T>(response: AxiosResponse, data: T): Promise<T> {
    let finalData = data;
    for (const interceptor of this.responseInterceptors) {
      finalData = await interceptor(response, finalData);
    }
    return finalData;
  }

  async applyErrorInterceptors(error: ApiError): Promise<ApiError> {
    let finalError = error;
    for (const interceptor of this.errorInterceptors) {
      finalError = await interceptor(finalError);
    }
    return finalError;
  }
}

export const interceptorManager = new InterceptorManager();

interceptorManager.addRequestInterceptor((config: RequestConfig) => {
  const accessToken = getCookie('tekcify_access_token');
  if (accessToken && typeof accessToken === 'string') {
    const headers = normalizeHeaders(config.headers);
    headers['Authorization'] = `Bearer ${accessToken}`;
    config.headers = headers;
  }
  return config;
});

interceptorManager.addErrorInterceptor(async (error: ApiError) => {
  if (error.data && typeof error.data === 'object') {
    const data = error.data as Record<string, unknown>;
    const errorObj = typeof data.error === 'object' ? (data.error as Record<string, unknown>) : undefined;
    const errorString = typeof data.error === 'string' ? data.error : undefined;

    const simplifiedMessage =
      errorObj?.message ||
      data.message ||
      errorString ||
      error.message;

    return new ApiError(
      typeof simplifiedMessage === 'string' ? simplifiedMessage : error.message,
      error.status,
      { message: simplifiedMessage }
    );
  }
  return error;
});

export const addRequestInterceptor = (interceptor: RequestInterceptor): void => {
  interceptorManager.addRequestInterceptor(interceptor);
};

export const addResponseInterceptor = (interceptor: ResponseInterceptor): void => {
  interceptorManager.addResponseInterceptor(interceptor);
};

export const addErrorInterceptor = (interceptor: ErrorInterceptor): void => {
  interceptorManager.addErrorInterceptor(interceptor);
};
