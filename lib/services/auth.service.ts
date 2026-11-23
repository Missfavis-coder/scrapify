
import type {
  AuthUser,
  AuthenticationResponse,
  CurrentUserResponse,
  LoginPayload,
  LogoutResponse,
  RegisterPayload,
} from "@/lib/types/auth";

async function authRequest(
  endpoint: string,
  payload: LoginPayload | RegisterPayload,
): Promise<AuthUser> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as AuthenticationResponse;

  if (!response.ok) {
    throw new Error(
      data.error || data.message || "Authentication request failed.",
    );
  }

  if (!data.user) {
    throw new Error("Authentication response did not include a user.");
  }

  return data.user;
}

async function me(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to retrieve the current user.");
  }

  const data = (await response.json()) as CurrentUserResponse;

  return data.user;
}

async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
    };

    throw new Error(
      data.error || data.message || "Unable to log out.",
    );
  }
}

export const authService = {
  register(payload: RegisterPayload) {
    return authRequest("/api/auth/register", payload);
  },

  login(payload: LoginPayload) {
    return authRequest("/api/auth/login", payload);
  },

  me,

  logout,
};
