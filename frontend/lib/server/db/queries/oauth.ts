import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  oauthAccessTokens,
  oauthAuthorizationCodes,
  oauthClients,
  oauthRefreshTokens,
  type OAuthAccessTokenRow,
  type OAuthAuthorizationCodeRow,
  type OAuthClientRow,
  type OAuthRefreshTokenRow,
} from "@/lib/server/db/schema";

interface InsertClientInput {
  clientId: string;
  clientSecretHash: string | null;
  clientName: string | null;
  redirectUris: string[];
  grantTypes: string[];
  responseTypes: string[];
  scope: string | null;
  tokenEndpointAuthMethod: string;
  clientUri: string | null;
  logoUri: string | null;
  softwareId: string | null;
  registeredByUserId: string | null;
}

export async function insertOAuthClient(
  input: InsertClientInput
): Promise<OAuthClientRow> {
  const db = getDb();
  const [row] = await db
    .insert(oauthClients)
    .values({ id: nanoid(), ...input })
    .returning();
  return row;
}

export async function findOAuthClientByClientId(
  clientId: string
): Promise<OAuthClientRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);
  return row ?? null;
}

interface InsertAuthorizationCodeInput {
  codeHash: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
  resource: string | null;
  expiresAt: Date;
}

export async function insertAuthorizationCode(
  input: InsertAuthorizationCodeInput
): Promise<OAuthAuthorizationCodeRow> {
  const db = getDb();
  const [row] = await db
    .insert(oauthAuthorizationCodes)
    .values({ id: nanoid(), ...input })
    .returning();
  return row;
}

export async function findAuthorizationCodeByHash(
  codeHash: string
): Promise<OAuthAuthorizationCodeRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.codeHash, codeHash))
    .limit(1);
  return row ?? null;
}

export async function consumeAuthorizationCode(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .update(oauthAuthorizationCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oauthAuthorizationCodes.id, id),
        isNull(oauthAuthorizationCodes.consumedAt)
      )
    )
    .returning({ id: oauthAuthorizationCodes.id });
  return rows.length > 0;
}

interface InsertAccessTokenInput {
  tokenHash: string;
  clientId: string;
  userId: string;
  scope: string | null;
  resource: string | null;
  refreshTokenId: string | null;
  expiresAt: Date;
}

export async function insertAccessToken(
  input: InsertAccessTokenInput
): Promise<OAuthAccessTokenRow> {
  const db = getDb();
  const [row] = await db
    .insert(oauthAccessTokens)
    .values({ id: nanoid(), ...input })
    .returning();
  return row;
}

export async function findAccessTokenByHash(
  tokenHash: string
): Promise<OAuthAccessTokenRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(oauthAccessTokens)
    .where(
      and(
        eq(oauthAccessTokens.tokenHash, tokenHash),
        isNull(oauthAccessTokens.revokedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function touchAccessTokenLastUsed(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(oauthAccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(oauthAccessTokens.id, id));
}

export async function revokeAccessTokenById(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthAccessTokens.id, id));
}

export async function revokeAccessTokensByRefreshTokenId(
  refreshTokenId: string
): Promise<void> {
  const db = getDb();
  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(oauthAccessTokens.refreshTokenId, refreshTokenId),
        isNull(oauthAccessTokens.revokedAt)
      )
    );
}

interface InsertRefreshTokenInput {
  tokenHash: string;
  clientId: string;
  userId: string;
  scope: string | null;
  resource: string | null;
  expiresAt: Date | null;
}

export async function insertRefreshToken(
  input: InsertRefreshTokenInput
): Promise<OAuthRefreshTokenRow> {
  const db = getDb();
  const [row] = await db
    .insert(oauthRefreshTokens)
    .values({ id: nanoid(), ...input })
    .returning();
  return row;
}

export async function findRefreshTokenByHash(
  tokenHash: string
): Promise<OAuthRefreshTokenRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(oauthRefreshTokens)
    .where(
      and(
        eq(oauthRefreshTokens.tokenHash, tokenHash),
        isNull(oauthRefreshTokens.revokedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function rotateRefreshTokenById(id: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .update(oauthRefreshTokens)
    .set({ rotatedAt: new Date(), revokedAt: new Date() })
    .where(
      and(
        eq(oauthRefreshTokens.id, id),
        isNull(oauthRefreshTokens.revokedAt)
      )
    )
    .returning({ id: oauthRefreshTokens.id });
  return rows.length > 0;
}

export async function revokeRefreshTokenById(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthRefreshTokens.id, id));
}
