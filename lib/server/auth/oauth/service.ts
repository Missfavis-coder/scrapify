import {
  consumeAuthorizationCode,
  findAccessTokenByHash,
  findAuthorizationCodeByHash,
  findRefreshTokenByHash,
  insertAccessToken,
  insertAuthorizationCode,
  insertRefreshToken,
  revokeAccessTokenById,
  revokeAccessTokensByRefreshTokenId,
  revokeRefreshTokenById,
  rotateRefreshTokenById,
  touchAccessTokenLastUsed,
} from "@/lib/server/db/queries/oauth";
import {
  generateAccessToken,
  generateAuthorizationCode,
  generateRefreshToken,
  hashSecret,
  isAccessTokenShape,
  verifyPkceS256,
} from "@/lib/server/auth/oauth/tokens";
import {
  OAUTH_ACCESS_TOKEN_TTL_SECONDS,
  OAUTH_AUTH_CODE_TTL_SECONDS,
  OAUTH_BEARER_TOKEN_TYPE,
  OAUTH_ERROR_CODES,
  OAUTH_OFFLINE_ACCESS_SCOPE,
  OAUTH_REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/constants/oauth";
import type {
  AuthorizationCodeInput,
  IssuedTokenSet,
  TokenExchangeResult,
  VerifiedOAuthToken,
} from "@/lib/types/oauth";
import type { OAuthClientRow } from "@/lib/server/db/schema";

function parseScopes(scope: string | null): string[] {
  return scope ? scope.split(" ").filter(Boolean) : [];
}

function scopeIncludesOffline(scope: string | null): boolean {
  return parseScopes(scope).includes(OAUTH_OFFLINE_ACCESS_SCOPE);
}

function isScopeSubset(requested: string, granted: string | null): boolean {
  const grantedSet = new Set(parseScopes(granted));
  return parseScopes(requested).every((scope) => grantedSet.has(scope));
}

function invalidGrant(description: string): TokenExchangeResult {
  return {
    ok: false,
    error: OAUTH_ERROR_CODES.invalidGrant,
    errorDescription: description,
    status: 400,
  };
}

export async function issueAuthorizationCode(
  input: AuthorizationCodeInput
): Promise<string> {
  const code = generateAuthorizationCode();
  await insertAuthorizationCode({
    codeHash: code.hash,
    clientId: input.clientId,
    userId: input.userId,
    redirectUri: input.redirectUri,
    scope: input.scope,
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: input.codeChallengeMethod,
    resource: input.resource,
    expiresAt: new Date(Date.now() + OAUTH_AUTH_CODE_TTL_SECONDS * 1000),
  });
  return code.value;
}

interface IssueTokenSetInput {
  clientId: string;
  userId: string;
  scope: string | null;
  resource: string | null;
  withRefresh: boolean;
}

async function issueTokenSet(input: IssueTokenSetInput): Promise<IssuedTokenSet> {
  let refreshTokenId: string | null = null;
  let refreshTokenValue: string | null = null;

  if (input.withRefresh) {
    const refresh = generateRefreshToken();
    const expiresAt =
      OAUTH_REFRESH_TOKEN_TTL_SECONDS > 0
        ? new Date(Date.now() + OAUTH_REFRESH_TOKEN_TTL_SECONDS * 1000)
        : null;
    const refreshRow = await insertRefreshToken({
      tokenHash: refresh.hash,
      clientId: input.clientId,
      userId: input.userId,
      scope: input.scope,
      resource: input.resource,
      expiresAt,
    });
    refreshTokenId = refreshRow.id;
    refreshTokenValue = refresh.value;
  }

  const access = generateAccessToken();
  await insertAccessToken({
    tokenHash: access.hash,
    clientId: input.clientId,
    userId: input.userId,
    scope: input.scope,
    resource: input.resource,
    refreshTokenId,
    expiresAt: new Date(Date.now() + OAUTH_ACCESS_TOKEN_TTL_SECONDS * 1000),
  });

  return {
    accessToken: access.value,
    refreshToken: refreshTokenValue,
    tokenType: OAUTH_BEARER_TOKEN_TYPE,
    expiresIn: OAUTH_ACCESS_TOKEN_TTL_SECONDS,
    scope: input.scope ?? "",
  };
}

interface ExchangeCodeInput {
  client: OAuthClientRow;
  code: string;
  codeVerifier: string | null;
  redirectUri: string | null;
  resource: string | null;
}

export async function exchangeAuthorizationCode(
  input: ExchangeCodeInput
): Promise<TokenExchangeResult> {
  const row = await findAuthorizationCodeByHash(hashSecret(input.code));
  if (!row) return invalidGrant("Authorization code is invalid.");
  if (row.clientId !== input.client.clientId) {
    return invalidGrant("Authorization code was issued to a different client.");
  }
  if (row.consumedAt) return invalidGrant("Authorization code has already been used.");
  if (row.expiresAt < new Date()) return invalidGrant("Authorization code has expired.");
  if (input.redirectUri !== null && input.redirectUri !== row.redirectUri) {
    return invalidGrant("redirect_uri does not match the authorization request.");
  }
  if (!input.codeVerifier) return invalidGrant("code_verifier is required.");
  if (row.codeChallengeMethod !== "S256") {
    return invalidGrant("Unsupported code_challenge_method.");
  }
  if (!verifyPkceS256(input.codeVerifier, row.codeChallenge)) {
    return invalidGrant("PKCE verification failed.");
  }

  const consumed = await consumeAuthorizationCode(row.id);
  if (!consumed) return invalidGrant("Authorization code has already been used.");

  const tokens = await issueTokenSet({
    clientId: row.clientId,
    userId: row.userId,
    scope: row.scope,
    resource: input.resource ?? row.resource,
    withRefresh: scopeIncludesOffline(row.scope),
  });
  return { ok: true, tokens };
}

interface ExchangeRefreshInput {
  client: OAuthClientRow;
  refreshToken: string;
  scope: string | null;
  resource: string | null;
}

export async function exchangeRefreshToken(
  input: ExchangeRefreshInput
): Promise<TokenExchangeResult> {
  const row = await findRefreshTokenByHash(hashSecret(input.refreshToken));
  if (!row) return invalidGrant("Refresh token is invalid.");
  if (row.clientId !== input.client.clientId) {
    return invalidGrant("Refresh token was issued to a different client.");
  }
  if (row.expiresAt && row.expiresAt < new Date()) {
    return invalidGrant("Refresh token has expired.");
  }
  if (input.scope && !isScopeSubset(input.scope, row.scope)) {
    return {
      ok: false,
      error: OAUTH_ERROR_CODES.invalidScope,
      errorDescription: "Requested scope exceeds the originally granted scope.",
      status: 400,
    };
  }

  const rotated = await rotateRefreshTokenById(row.id);
  if (!rotated) return invalidGrant("Refresh token has already been used.");
  await revokeAccessTokensByRefreshTokenId(row.id);

  const tokens = await issueTokenSet({
    clientId: row.clientId,
    userId: row.userId,
    scope: input.scope ?? row.scope,
    resource: input.resource ?? row.resource,
    withRefresh: true,
  });
  return { ok: true, tokens };
}

interface RevokeTokenInput {
  client: OAuthClientRow;
  token: string;
}

export async function revokeOAuthToken(
  input: RevokeTokenInput
): Promise<void> {
  const hash = hashSecret(input.token);

  const refreshRow = await findRefreshTokenByHash(hash);
  if (refreshRow && refreshRow.clientId === input.client.clientId) {
    await revokeRefreshTokenById(refreshRow.id);
    await revokeAccessTokensByRefreshTokenId(refreshRow.id);
    return;
  }

  const accessRow = await findAccessTokenByHash(hash);
  if (accessRow && accessRow.clientId === input.client.clientId) {
    await revokeAccessTokenById(accessRow.id);
  }
}

export async function verifyOAuthAccessToken(
  rawToken: string
): Promise<VerifiedOAuthToken | null> {
  if (!isAccessTokenShape(rawToken)) return null;
  const row = await findAccessTokenByHash(hashSecret(rawToken));
  if (!row) return null;
  if (row.expiresAt < new Date()) return null;
  void touchAccessTokenLastUsed(row.id).catch(() => {});
  return {
    userId: row.userId,
    clientId: row.clientId,
    tokenId: row.id,
    scopes: parseScopes(row.scope),
    resource: row.resource,
    expiresAt: Math.floor(row.expiresAt.getTime() / 1000),
  };
}
