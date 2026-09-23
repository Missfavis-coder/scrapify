import { FIGMA_OAUTH } from "@/lib/constants/inspiration";
import { getServerEnv } from "@/lib/server/env";
import {
  decryptToken,
  encryptToken,
} from "@/lib/server/auth/token-encryption";
import {
  FigmaOAuthError,
  refreshFigmaToken,
} from "@/lib/server/auth/figma-oauth";
import {
  deleteFigmaConnection,
  getFigmaConnection,
  updateFigmaTokens,
} from "@/lib/server/db/queries/figma-connections";
import { logError, logEvent } from "@/lib/server/logger";

export type FigmaTokenSource = "user" | "env";

export interface FigmaTokenContext {
  token: string;
  source: FigmaTokenSource;
}

export async function getFigmaTokenForUser(
  userId: string | null
): Promise<FigmaTokenContext | null> {
  if (userId) {
    const userToken = await loadUserFigmaToken(userId);
    if (userToken) return { token: userToken, source: "user" };
  }
  const env = getServerEnv();
  if (env.FIGMA_TOKEN && env.FIGMA_TOKEN.trim().length > 0) {
    return { token: env.FIGMA_TOKEN.trim(), source: "env" };
  }
  return null;
}

export async function clearFigmaConnectionForUser(
  userId: string
): Promise<void> {
  await deleteFigmaConnection(userId);
}

async function loadUserFigmaToken(userId: string): Promise<string | null> {
  const row = await getFigmaConnection(userId);
  if (!row) return null;

  if (!isExpiringSoon(row.expiresAt)) {
    try {
      return decryptToken(row.accessTokenEncrypted);
    } catch (error) {
      logError("figma.token.decrypt_failed", error, { userId });
      await deleteFigmaConnection(userId);
      return null;
    }
  }

  try {
    const refreshToken = decryptToken(row.refreshTokenEncrypted);
    const refreshed = await refreshFigmaToken(refreshToken);
    const nextRefreshToken = refreshed.refreshToken ?? refreshToken;
    await updateFigmaTokens({
      userId,
      accessTokenEncrypted: encryptToken(refreshed.accessToken),
      refreshTokenEncrypted: encryptToken(nextRefreshToken),
      scope: refreshed.scope ?? undefined,
      expiresAt: refreshed.expiresAt,
    });
    logEvent("figma.token.refreshed", { userId });
    return refreshed.accessToken;
  } catch (error) {
    if (
      error instanceof FigmaOAuthError &&
      (error.status === 400 || error.status === 401)
    ) {
      logEvent("figma.token.refresh_invalid", { userId });
      await deleteFigmaConnection(userId);
      return null;
    }
    logError("figma.token.refresh_failed", error, { userId });
    return null;
  }
}

function isExpiringSoon(expiresAt: Date): boolean {
  const bufferMs = FIGMA_OAUTH.refreshBufferSeconds * 1000;
  return expiresAt.getTime() - Date.now() <= bufferMs;
}
