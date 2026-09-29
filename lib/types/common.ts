export interface ApiErrorShape {
  error: string;
  code: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  data: T;
}

export type Nullable<T> = T | null;
