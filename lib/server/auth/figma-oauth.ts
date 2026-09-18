import { FIGMA_OAUTH } from "@/lib/constants/inspiration";
import { getServerEnv } from "@/lib/server/env";

export class FigmaOAuthNotConfiguredError extends Error {
  code: string;
  constructor() {
    super(
      "Figma OAuth is not configured. Set FIGMA_OAUTH_CLIENT_ID and FIGMA_OAUTH_CLIENT_SECRET."
    );
    this.name = "FigmaOAuthNotConfiguredError";
    this.code = "FIGMA_OAUTH_NOT_CONFIGURED";
  }
}

export class FigmaOAuthError extends Error {
  code: string;
  status: number;
  constructor(message: string, code: string, status = 502) {
    super(message);
    this.name = "FigmaOAuthError";
    this.code = code;
    this.status = status;
  }
}

export function isFigmaOAuthConfigured(): boolean {
  try {
    const env = getServerEnv();
    return Boolean(env.FIGMA_OAUTH_CLIENT_ID && env.FIGMA_OAUTH_CLIENT_SECRET);
  } catch {
    return false;
  }
}

export function getFigmaAuthUrl(state: string, redirectUri: string): string {
  const env = getServerEnv();
  if (!env.FIGMA_OAUTH_CLIENT_ID) throw new FigmaOAuthNotConfiguredError();
  const params = new URLSearchParams({
    client_id: env.FIGMA_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: FIGMA_OAUTH.scope,
    state,
    response_type: "code",
  });
  return `${FIGMA_OAUTH.authorizeUrl}?${params.toString()}`;
}

export interface FigmaTokenBundle {
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresAt: Date;
}

export interface FigmaProfile {
  id: string;
  email: string | null;
  handle: string | null;
}

interface RawTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeFigmaCode(
  code: string,
  redirectUri: string
): Promise<FigmaTokenBundle> {
  const env = getServerEnv();
  if (!env.FIGMA_OAUTH_CLIENT_ID || !env.FIGMA_OAUTH_CLIENT_SECRET) {
    throw new FigmaOAuthNotConfiguredError();
  }

  const body = new URLSearchParams({
    client_id: env.FIGMA_OAUTH_CLIENT_ID,
    client_secret: env.FIGMA_OAUTH_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code,
    grant_type: "authorization_code",
  });

  const response = await fetch(FIGMA_OAUTH.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await safeJson(response)) as RawTokenResponse;
  if (!response.ok || !data.access_token || !data.refresh_token) {
    throw new FigmaOAuthError(
      data.error_description ?? data.error ?? "Figma token exchange failed",
      data.error ?? "FIGMA_TOKEN_EXCHANGE_FAILED",
      response.status
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    scope: data.scope ?? FIGMA_OAUTH.scope,
    expiresAt: expiresAtFromSeconds(data.expires_in),
  };
}

export interface RefreshedFigmaToken {
  accessToken: string;
  refreshToken: string | null;
  scope: string | null;
  expiresAt: Date;
}

export async function refreshFigmaToken(
  refreshToken: string
): Promise<RefreshedFigmaToken> {
  const env = getServerEnv();
  if (!env.FIGMA_OAUTH_CLIENT_ID || !env.FIGMA_OAUTH_CLIENT_SECRET) {
    throw new FigmaOAuthNotConfiguredError();
  }

  const body = new URLSearchParams({
    client_id: env.FIGMA_OAUTH_CLIENT_ID,
    client_secret: env.FIGMA_OAUTH_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch(FIGMA_OAUTH.refreshUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await safeJson(response)) as RawTokenResponse;
  if (!response.ok || !data.access_token) {
    throw new FigmaOAuthError(
      data.error_description ?? data.error ?? "Figma token refresh failed",
      data.error ?? "FIGMA_TOKEN_REFRESH_FAILED",
      response.status
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    scope: data.scope ?? null,
    expiresAt: expiresAtFromSeconds(data.expires_in),
  };
}

interface RawFigmaMe {
  id?: string;
  email?: string;
  handle?: string;
}

export async function fetchFigmaProfile(
  accessToken: string
): Promise<FigmaProfile> {
  const response = await fetch(FIGMA_OAUTH.meUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const data = (await safeJson(response)) as RawFigmaMe;
  if (!response.ok || !data.id) {
    throw new FigmaOAuthError(
      "Could not load Figma profile",
      "FIGMA_PROFILE_FAILED",
      response.status
    );
  }
  return {
    id: data.id,
    email: data.email ?? null,
    handle: data.handle ?? null,
  };
}

function expiresAtFromSeconds(seconds?: number): Date {
  const safe = typeof seconds === "number" && seconds > 0 ? seconds : 60 * 60;
  return new Date(Date.now() + safe * 1000);
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
