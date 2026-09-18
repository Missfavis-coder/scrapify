import { verifyApiKey, extractApiKeyFromHeader } from "@/lib/server/auth/api-key";
import { verifyCliToken, extractBearerToken } from "@/lib/server/auth/cli-token";
import { verifyOAuthAccessToken } from "@/lib/server/auth/oauth/service";
import { isAccessTokenShape } from "@/lib/server/auth/oauth/tokens";
import { API_KEY_PREFIX } from "@/lib/constants/api-keys";
import type { BearerIdentity } from "@/lib/types/auth";

export async function resolveBearerIdentity(
  request: Request
): Promise<BearerIdentity | null> {
  const raw = extractBearerToken(request.headers.get("authorization"));
  if (!raw) return null;

  if (extractApiKeyFromHeader(request.headers.get("authorization"))) {
    const apiKey = await verifyApiKey(request);
    if (apiKey) {
      return { userId: apiKey.userId, keyId: apiKey.keyId, source: "api_key" };
    }
  }

  if (isAccessTokenShape(raw)) {
    const oauthToken = await verifyOAuthAccessToken(raw);
    if (oauthToken) {
      return {
        userId: oauthToken.userId,
        keyId: oauthToken.tokenId,
        source: "oauth_token",
      };
    }
  }

  const cliToken = await verifyCliToken(raw);
  if (cliToken) {
    return {
      userId: cliToken.user.id,
      keyId: cliToken.tokenId,
      source: "cli_token",
    };
  }

  return null;
}

export async function resolveBearerUserId(
  request: Request
): Promise<string | null> {
  const identity = await resolveBearerIdentity(request);
  return identity?.userId ?? null;
}

export function hasApiKeyShape(authorization: string | null): boolean {
  if (!authorization) return false;
  return authorization.replace(/^Bearer\s+/i, "").trim().startsWith(API_KEY_PREFIX);
}
