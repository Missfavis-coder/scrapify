import { OAuthClient, type UserInfo } from "@tekcify/auth-core-client";
import { getServerEnv } from "@/lib/server/env";
import type { TekcifyUserProfile } from "@/lib/types/auth";

const SCOPES = ["read:profile", "write:profile", "read:email"];

interface TekcifyOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

let cached: OAuthClient | null = null;
let cachedConfig: TekcifyOAuthConfig | null = null;

function loadConfig(): TekcifyOAuthConfig {
  const env = getServerEnv();
  if (
    !env.TEKCIFY_CLIENT_ID ||
    !env.TEKCIFY_CLIENT_SECRET ||
    !env.TEKCIFY_REDIRECT_URI
  ) {
    throw new Error(
      "Tekcify OAuth is not configured. Set TEKCIFY_CLIENT_ID, TEKCIFY_CLIENT_SECRET, TEKCIFY_REDIRECT_URI."
    );
  }
  return {
    clientId: env.TEKCIFY_CLIENT_ID,
    clientSecret: env.TEKCIFY_CLIENT_SECRET,
    redirectUri: env.TEKCIFY_REDIRECT_URI,
    scopes: SCOPES,
  };
}

export function getTekcifyOAuthConfig(): TekcifyOAuthConfig {
  if (cachedConfig) return cachedConfig;
  cachedConfig = loadConfig();
  return cachedConfig;
}

export function getTekcifyOAuthClient(): OAuthClient {
  if (cached) return cached;
  cached = new OAuthClient(getTekcifyOAuthConfig());
  return cached;
}

export function isTekcifyAuthConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(
    env.TEKCIFY_CLIENT_ID &&
      env.TEKCIFY_CLIENT_SECRET &&
      env.TEKCIFY_REDIRECT_URI
  );
}

export class TekcifyProfileError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    this.name = "TekcifyProfileError";
    this.code = "TEKCIFY_PROFILE_INVALID";
  }
}

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function toTekcifyProfile(info: UserInfo): TekcifyUserProfile {
  const sub = trimmedString(info.sub);
  const email = trimmedString(info.email);
  if (!sub) {
    throw new TekcifyProfileError(
      "Tekcify userinfo response is missing a subject identifier"
    );
  }
  if (!email) {
    throw new TekcifyProfileError(
      "Tekcify userinfo response is missing an email address"
    );
  }
  return {
    sub,
    email,
    emailVerified: Boolean(info.email_verified),
    name: trimmedString(info.name) || null,
    picture: trimmedString(info.picture) || null,
  };
}
