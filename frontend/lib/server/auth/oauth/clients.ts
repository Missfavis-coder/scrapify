import {
  findOAuthClientByClientId,
  insertOAuthClient,
} from "@/lib/server/db/queries/oauth";
import {
  generateClientId,
  generateClientSecret,
  hashSecret,
  constantTimeEquals,
} from "@/lib/server/auth/oauth/tokens";
import {
  OAUTH_BLOCKED_REDIRECT_SCHEMES,
  OAUTH_ERROR_CODES,
  OAUTH_GRANT_TYPES,
  OAUTH_LOOPBACK_HOSTS,
  OAUTH_MAX_REDIRECT_URIS,
  OAUTH_RESPONSE_TYPES,
  OAUTH_TOKEN_ENDPOINT_AUTH_METHODS,
} from "@/lib/constants/oauth";
import type { OAuthClientRecord } from "@/lib/types/oauth";
import type { OAuthClientRow } from "@/lib/server/db/schema";

export interface RegisterClientInput {
  clientName: string | null;
  redirectUris: string[];
  grantTypes?: string[];
  responseTypes?: string[];
  scope?: string | null;
  tokenEndpointAuthMethod?: string;
  clientUri?: string | null;
  logoUri?: string | null;
  softwareId?: string | null;
  registeredByUserId?: string | null;
}

export type RegisterClientResult =
  | { ok: true; client: OAuthClientRecord; clientSecret: string | null }
  | { ok: false; error: string; errorDescription: string };

export function toClientRecord(row: OAuthClientRow): OAuthClientRecord {
  return {
    id: row.id,
    clientId: row.clientId,
    clientName: row.clientName,
    redirectUris: row.redirectUris,
    grantTypes: row.grantTypes,
    responseTypes: row.responseTypes,
    scope: row.scope,
    tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
    hasSecret: Boolean(row.clientSecretHash),
    clientUri: row.clientUri,
    logoUri: row.logoUri,
    createdAt: row.createdAt.toISOString(),
  };
}

export function isAllowedRedirectUri(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (
    (OAUTH_BLOCKED_REDIRECT_SCHEMES as readonly string[]).includes(url.protocol)
  ) {
    return false;
  }
  if (url.protocol === "https:") return true;
  if (url.protocol === "http:") {
    return (OAUTH_LOOPBACK_HOSTS as readonly string[]).includes(url.hostname);
  }
  return true;
}

export function isPublicClient(row: OAuthClientRow): boolean {
  return row.tokenEndpointAuthMethod === "none" || !row.clientSecretHash;
}

export function clientAllowsRedirectUri(
  row: OAuthClientRow,
  redirectUri: string
): boolean {
  return row.redirectUris.includes(redirectUri);
}

export function verifyClientSecret(
  row: OAuthClientRow,
  secret: string
): boolean {
  if (!row.clientSecretHash) return false;
  return constantTimeEquals(hashSecret(secret), row.clientSecretHash);
}

export async function getClientRow(
  clientId: string
): Promise<OAuthClientRow | null> {
  return findOAuthClientByClientId(clientId);
}

export async function registerClient(
  input: RegisterClientInput
): Promise<RegisterClientResult> {
  if (input.redirectUris.length === 0) {
    return {
      ok: false,
      error: OAUTH_ERROR_CODES.invalidRedirectUri,
      errorDescription: "At least one redirect_uri is required.",
    };
  }
  if (input.redirectUris.length > OAUTH_MAX_REDIRECT_URIS) {
    return {
      ok: false,
      error: OAUTH_ERROR_CODES.invalidRedirectUri,
      errorDescription: `A maximum of ${OAUTH_MAX_REDIRECT_URIS} redirect_uris is allowed.`,
    };
  }
  for (const uri of input.redirectUris) {
    if (!isAllowedRedirectUri(uri)) {
      return {
        ok: false,
        error: OAUTH_ERROR_CODES.invalidRedirectUri,
        errorDescription: `redirect_uri is not allowed: ${uri}`,
      };
    }
  }

  const grantTypes = input.grantTypes ?? [...OAUTH_GRANT_TYPES];
  for (const grant of grantTypes) {
    if (!(OAUTH_GRANT_TYPES as readonly string[]).includes(grant)) {
      return {
        ok: false,
        error: OAUTH_ERROR_CODES.invalidClientMetadata,
        errorDescription: `Unsupported grant_type: ${grant}`,
      };
    }
  }

  const responseTypes = input.responseTypes ?? [...OAUTH_RESPONSE_TYPES];
  for (const responseType of responseTypes) {
    if (!(OAUTH_RESPONSE_TYPES as readonly string[]).includes(responseType)) {
      return {
        ok: false,
        error: OAUTH_ERROR_CODES.invalidClientMetadata,
        errorDescription: `Unsupported response_type: ${responseType}`,
      };
    }
  }

  const authMethod = input.tokenEndpointAuthMethod ?? "none";
  if (
    !(OAUTH_TOKEN_ENDPOINT_AUTH_METHODS as readonly string[]).includes(
      authMethod
    )
  ) {
    return {
      ok: false,
      error: OAUTH_ERROR_CODES.invalidClientMetadata,
      errorDescription: `Unsupported token_endpoint_auth_method: ${authMethod}`,
    };
  }

  const secret = authMethod === "none" ? null : generateClientSecret();

  const row = await insertOAuthClient({
    clientId: generateClientId(),
    clientSecretHash: secret?.hash ?? null,
    clientName: input.clientName,
    redirectUris: input.redirectUris,
    grantTypes,
    responseTypes,
    scope: input.scope ?? null,
    tokenEndpointAuthMethod: authMethod,
    clientUri: input.clientUri ?? null,
    logoUri: input.logoUri ?? null,
    softwareId: input.softwareId ?? null,
    registeredByUserId: input.registeredByUserId ?? null,
  });

  return {
    ok: true,
    client: toClientRecord(row),
    clientSecret: secret?.value ?? null,
  };
}
