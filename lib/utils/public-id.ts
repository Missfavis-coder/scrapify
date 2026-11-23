import { randomBytes } from "node:crypto";

export function generatePublicId(): string {
  return `scf_${randomBytes(6).toString("base64url")}`;
}