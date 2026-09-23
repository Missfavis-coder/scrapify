import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { getServerEnv } from "@/lib/server/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_INFO = "getskillmd:oauth-tokens:v1";

class TokenEncryptionConfigError extends Error {
  code: string;
  constructor() {
    super("SESSION_SECRET must be set to encrypt OAuth tokens.");
    this.name = "TokenEncryptionConfigError";
    this.code = "TOKEN_ENCRYPTION_NOT_CONFIGURED";
  }
}

function deriveKey(): Buffer {
  const env = getServerEnv();
  if (!env.SESSION_SECRET) throw new TokenEncryptionConfigError();
  return createHash("sha256")
    .update(KEY_INFO)
    .update(env.SESSION_SECRET)
    .digest();
}

export function encryptToken(plainText: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted token payload");
  }
  const [, ivPart, tagPart, dataPart] = parts;
  const key = deriveKey();
  const iv = Buffer.from(ivPart, "base64url");
  const authTag = Buffer.from(tagPart, "base64url");
  const ciphertext = Buffer.from(dataPart, "base64url");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}
