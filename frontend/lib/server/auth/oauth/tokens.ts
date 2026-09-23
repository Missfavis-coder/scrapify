import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { sha256Hex } from "@/lib/utils/hash";
import {
  OAUTH_ACCESS_TOKEN_PREFIX,
  OAUTH_AUTH_CODE_PREFIX,
  OAUTH_AUTH_CODE_RANDOM_BYTES,
  OAUTH_CLIENT_ID_PREFIX,
  OAUTH_CLIENT_ID_RANDOM_BYTES,
  OAUTH_CLIENT_SECRET_PREFIX,
  OAUTH_CLIENT_SECRET_RANDOM_BYTES,
  OAUTH_REFRESH_TOKEN_PREFIX,
  OAUTH_TOKEN_RANDOM_BYTES,
} from "@/lib/constants/oauth";

export interface GeneratedSecret {
  value: string;
  hash: string;
}

function generateSecret(prefix: string, bytes: number): GeneratedSecret {
  const value = `${prefix}${randomBytes(bytes).toString("base64url")}`;
  return { value, hash: sha256Hex(value) };
}

export function hashSecret(value: string): string {
  return sha256Hex(value);
}

export function generateClientId(): string {
  return `${OAUTH_CLIENT_ID_PREFIX}${randomBytes(
    OAUTH_CLIENT_ID_RANDOM_BYTES
  ).toString("base64url")}`;
}

export function generateClientSecret(): GeneratedSecret {
  return generateSecret(
    OAUTH_CLIENT_SECRET_PREFIX,
    OAUTH_CLIENT_SECRET_RANDOM_BYTES
  );
}

export function generateAuthorizationCode(): GeneratedSecret {
  return generateSecret(OAUTH_AUTH_CODE_PREFIX, OAUTH_AUTH_CODE_RANDOM_BYTES);
}

export function generateAccessToken(): GeneratedSecret {
  return generateSecret(OAUTH_ACCESS_TOKEN_PREFIX, OAUTH_TOKEN_RANDOM_BYTES);
}

export function generateRefreshToken(): GeneratedSecret {
  return generateSecret(OAUTH_REFRESH_TOKEN_PREFIX, OAUTH_TOKEN_RANDOM_BYTES);
}

export function computePkceS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  const computed = computePkceS256Challenge(verifier);
  return constantTimeEquals(computed, challenge);
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function isAccessTokenShape(value: string): boolean {
  return value.startsWith(OAUTH_ACCESS_TOKEN_PREFIX);
}
