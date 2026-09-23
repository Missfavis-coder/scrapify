import { randomBytes } from "node:crypto";
import {
  findApiKeyByHash,
  touchApiKey,
} from "@/lib/server/db/queries/api-keys";
import { sha256Hex } from "@/lib/utils/hash";
import {
  API_KEY_DISPLAY_PREFIX_LENGTH,
  API_KEY_PREFIX,
  API_KEY_RANDOM_BYTES,
} from "@/lib/constants/api-keys";
import type { VerifiedApiKey } from "@/lib/types/api-keys";

export interface GeneratedApiKey {
  rawKey: string;
  hash: string;
  prefix: string;
}

export function hashApiKey(rawKey: string): string {
  return sha256Hex(rawKey);
}

export function generateApiKey(): GeneratedApiKey {
  const random = randomBytes(API_KEY_RANDOM_BYTES).toString("base64url");
  const rawKey = `${API_KEY_PREFIX}${random}`;
  const hash = hashApiKey(rawKey);
  const prefix = rawKey.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH);
  return { rawKey, hash, prefix };
}

export function extractApiKeyFromHeader(
  authorization: string | null
): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token.startsWith(API_KEY_PREFIX)) return null;
  return token;
}

export async function verifyApiKey(
  request: Request
): Promise<VerifiedApiKey | null> {
  const rawKey = extractApiKeyFromHeader(
    request.headers.get("authorization")
  );
  if (!rawKey) return null;
  const row = await findApiKeyByHash(hashApiKey(rawKey));
  if (!row) return null;
  if (row.revokedAt) return null;
  void touchApiKey(row.id).catch(() => {});
  return { userId: row.userId, keyId: row.id };
}
