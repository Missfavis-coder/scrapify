import { getClientRow } from "@/lib/server/auth/oauth/clients";
import {
  OAUTH_DEFAULT_SCOPES,
  OAUTH_ERROR_CODES,
  OAUTH_SCOPES,
} from "@/lib/constants/oauth";
import type { OAuthClientRow } from "@/lib/server/db/schema";

export interface RawAuthorizationRequest {
  responseType?: string;
  clientId?: string;
  redirectUri?: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
}

export interface ValidatedAuthorizationRequest {
  client: OAuthClientRow;
  clientId: string;
  redirectUri: string;
  scope: string;
  scopes: string[];
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string | null;
}

export type AuthorizationRequestValidation =
  | { kind: "invalid"; message: string }
  | {
      kind: "redirect-error";
      redirectUri: string;
      error: string;
      errorDescription: string;
      state: string | null;
    }
  | { kind: "ok"; request: ValidatedAuthorizationRequest };

function parseScopeList(scope: string | undefined): string[] {
  return scope ? scope.split(/\s+/).filter(Boolean) : [];
}

export function buildRedirectUrl(
  redirectUri: string,
  params: Record<string, string | null | undefined>
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function validateAuthorizationRequest(
  raw: RawAuthorizationRequest
): Promise<AuthorizationRequestValidation> {
  const state = raw.state ?? null;

  if (!raw.clientId) {
    return { kind: "invalid", message: "Missing client_id." };
  }

  const client = await getClientRow(raw.clientId);
  if (!client) {
    return { kind: "invalid", message: "Unknown client_id." };
  }

  let redirectUri = raw.redirectUri;
  if (redirectUri) {
    if (!client.redirectUris.includes(redirectUri)) {
      return {
        kind: "invalid",
        message: "redirect_uri is not registered for this client.",
      };
    }
  } else if (client.redirectUris.length === 1) {
    redirectUri = client.redirectUris[0];
  } else {
    return {
      kind: "invalid",
      message: "redirect_uri is required for this client.",
    };
  }

  if (raw.responseType !== "code") {
    return {
      kind: "redirect-error",
      redirectUri,
      error: OAUTH_ERROR_CODES.unsupportedResponseType,
      errorDescription: "Only response_type=code is supported.",
      state,
    };
  }

  if (!raw.codeChallenge || raw.codeChallengeMethod !== "S256") {
    return {
      kind: "redirect-error",
      redirectUri,
      error: OAUTH_ERROR_CODES.invalidRequest,
      errorDescription:
        "PKCE is required: provide code_challenge with code_challenge_method=S256.",
      state,
    };
  }

  const requestedScopes = parseScopeList(raw.scope);
  for (const scope of requestedScopes) {
    if (!(OAUTH_SCOPES as readonly string[]).includes(scope)) {
      return {
        kind: "redirect-error",
        redirectUri,
        error: OAUTH_ERROR_CODES.invalidScope,
        errorDescription: `Unknown scope: ${scope}`,
        state,
      };
    }
  }

  const scopes =
    requestedScopes.length > 0
      ? requestedScopes
      : parseScopeList(client.scope ?? undefined).length > 0
        ? parseScopeList(client.scope ?? undefined)
        : [...OAUTH_DEFAULT_SCOPES];

  return {
    kind: "ok",
    request: {
      client,
      clientId: client.clientId,
      redirectUri,
      scope: scopes.join(" "),
      scopes,
      state,
      codeChallenge: raw.codeChallenge,
      codeChallengeMethod: raw.codeChallengeMethod,
      resource: raw.resource ?? null,
    },
  };
}
