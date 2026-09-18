import { createHash } from "node:crypto";

export function hashIp(ip: string, salt: string): string {
  return createHash("sha256").update(`${salt}::${ip}`).digest("hex").slice(0, 32);
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256Short(input: string, length = 16): string {
  return createHash("sha256").update(input).digest("hex").slice(0, length);
}
