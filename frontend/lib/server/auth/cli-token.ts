import { randomBytes } from "node:crypto";
import {
  findCliTokenByHash,
  insertCliToken,
  touchCliTokenLastUsed,
} from "@/lib/server/db/queries/cli-tokens";
import { findUserById, toAuthUser } from "@/lib/server/db/queries/users";
import { sha256Hex } from "@/lib/utils/hash";
import { CLI_TOKEN_PREFIX } from "@/lib/constants/billing";
import type { AuthUser } from "@/lib/types/auth";

const TOKEN_BYTES = 32;

interface IssueCliTokenInput {
  userId: string;
  label: string | null;
  ttlMs?: number | null;
}

export interface IssuedCliToken {
  token: string;
  hash: string;
}

export function generateRawCliToken(): IssuedCliToken {
  const random = randomBytes(TOKEN_BYTES).toString("base64url");
  const token = `${CLI_TOKEN_PREFIX}${random}`;
  return { token, hash: sha256Hex(token) };
}

export async function issueCliToken(
  input: IssueCliTokenInput
): Promise<IssuedCliToken> {
  const generated = generateRawCliToken();
  const expiresAt =
    input.ttlMs && input.ttlMs > 0 ? new Date(Date.now() + input.ttlMs) : null;
  await insertCliToken({
    userId: input.userId,
    tokenHash: generated.hash,
    label: input.label,
    expiresAt,
  });
  return generated;
}

export interface VerifiedCliToken {
  user: AuthUser;
  tokenId: string;
}

export async function verifyCliToken(
  rawToken: string
): Promise<VerifiedCliToken | null> {
  if (!rawToken || rawToken.length < CLI_TOKEN_PREFIX.length + 8) return null;
  const hash = sha256Hex(rawToken);
  const tokenRow = await findCliTokenByHash(hash);
  if (!tokenRow) return null;
  if (tokenRow.expiresAt && tokenRow.expiresAt < new Date()) return null;
  const user = await findUserById(tokenRow.userId);
  if (!user) return null;
  void touchCliTokenLastUsed(tokenRow.id).catch(() => {});
  return { user: toAuthUser(user), tokenId: tokenRow.id };
}

export function extractBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return match[1].trim();
}
