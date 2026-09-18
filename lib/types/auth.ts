export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface OAuthCallbackParams {
  code: string;
  state?: string;
}

export interface OAuthCallbackResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// user model
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;      // Optional since it might not always be returned
  role?: string; 

}

// responses
export interface AuthResponse {
  user: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface MeResponse {
  user: User;
}