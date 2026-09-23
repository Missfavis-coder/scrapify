import axios from "axios";
import { getBaseUrl } from "@/lib/api/config";
import { resetTokenRefreshQueue, setAuthTokens, clearAuthTokens, tokenStorage } from "@/lib/api/client";
import type {
  OAuthCallbackResponse,
  RefreshTokenResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  MeResponse,
  User,
} from "@/lib/types/api";

interface BackendTokenResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const axiosInstance = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
axiosInstance.interceptors.request.use((config) => {
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle token refresh on 401 responses
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          const newTokens = await authService.refreshToken();
          if (newTokens) {
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return axiosInstance(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearAuthTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  clearAuth(): void {
    clearAuthTokens();
    resetTokenRefreshQueue();
  },

  // OAUTH CALLBACK
  async handleCallback(
    code: string,
    state: string,
    codeVerifier?: string,
    referralCode?: string
  ): Promise<OAuthCallbackResponse> {
    const response = await axiosInstance.post<
      BackendTokenResponse<OAuthCallbackResponse>
    >("/auth/callback", {
      code,
      state,
      codeVerifier,
      referralCode,
    });

    const result = response.data;

    if (!result.success || !result.data) {
      throw new Error(
        result.message || result.error || "Authentication failed"
      );
    }

    // Store tokens if returned from OAuth
    if (result.data.accessToken && result.data.refreshToken) {
      setAuthTokens(result.data.accessToken, result.data.refreshToken);
    }

    return result.data;
  },

  // LOGIN - Updated to store tokens
  async login(payload: LoginRequest): Promise<User > {
    const response = await axiosInstance.post<
      BackendTokenResponse<AuthResponse>
    >("/auth/login", payload);

    const result = response.data;

    if ( !result.data) {
      throw new Error(result.message || "Login failed");
    }

    // Store tokens from login response
    if (result.data.accessToken && result.data.refreshToken) {
      setAuthTokens(result.data.accessToken, result.data.refreshToken);
    }

    return result.data.user;
  },

  // REGISTER - Updated to store tokens
  async register(payload: RegisterRequest): Promise<User> {
    const response = await axiosInstance.post<
      BackendTokenResponse<AuthResponse>
    >("/auth/register", payload);

    const result = response.data;

    if (!result.success || !result.data) {
      throw new Error(result.message || result.error || "Registration failed");
    }

    // Store tokens from registration response (if auto-login)
    if (result.data.accessToken && result.data.refreshToken) {
      setAuthTokens(result.data.accessToken, result.data.refreshToken);
    }

    return result.data.user;
  },

  async getMe(): Promise<User | null> {
    const accessToken = tokenStorage.getAccessToken();
    if (!accessToken) return null;
  
    const response = await axiosInstance.get("/auth/me");
  
    const result = response.data;
  
    if (!result?.data) return null;
  
    return result.data; 
  },
  // REFRESH TOKEN - Updated to handle token refresh
  async refreshToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        return null;
      }

      const response = await axiosInstance.post<
        BackendTokenResponse<RefreshTokenResponse>
      >("/auth/refresh", {
        refreshToken,
      });

      const result = response.data;

      if (!result.success || !result.data) {
        clearAuthTokens();
        resetTokenRefreshQueue();
        return null;
      }

      // Update stored tokens
      if (result.data.accessToken) {
        setAuthTokens(
          result.data.accessToken,
          result.data.refreshToken || refreshToken
        );
        
        return {
          accessToken: result.data.accessToken,
          refreshToken: result.data.refreshToken || refreshToken,
        };
      }

      return null;
    } catch (error) {
      console.error("Token refresh error:", error);
      clearAuthTokens();
      resetTokenRefreshQueue();
      return null;
    }
  },

  // LOGOUT - Updated to clear tokens
  async logout(): Promise<void> {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        await axiosInstance.post("/auth/logout", {
          refreshToken,
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear tokens regardless of API response
      this.clearAuth();
    }
  },

  // Helper method to check if user is authenticated
  isAuthenticated(): boolean {
    return !!tokenStorage.getAccessToken();
  },

  // Helper method to get current token (for debugging)
  getCurrentToken(): string | null {
    return tokenStorage.getAccessToken();
  },
};

// Export token storage for external use
export { tokenStorage };