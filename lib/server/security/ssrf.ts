import { promises as dns } from "node:dns";
import { isIP } from "node:net";

export const SSRF_ERROR_CODE = "SSRF_BLOCKED";

export class SsrfBlockedError extends Error {
  readonly code = SSRF_ERROR_CODE;
  readonly reason: SsrfBlockReason;

  constructor(message: string, reason: SsrfBlockReason) {
    super(message);
    this.name = "SsrfBlockedError";
    this.reason = reason;
  }
}

export type SsrfBlockReason =
  | "INVALID_URL"
  | "UNSUPPORTED_SCHEME"
  | "BLOCKED_HOSTNAME"
  | "DNS_FAILED"
  | "PRIVATE_IP";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);

const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal"];

interface CidrV4 {
  base: number;
  mask: number;
}

const BLOCKED_V4_CIDRS: readonly CidrV4[] = [
  cidr("0.0.0.0", 8),
  cidr("10.0.0.0", 8),
  cidr("100.64.0.0", 10),
  cidr("127.0.0.0", 8),
  cidr("169.254.0.0", 16),
  cidr("172.16.0.0", 12),
  cidr("192.0.0.0", 24),
  cidr("192.0.2.0", 24),
  cidr("192.168.0.0", 16),
  cidr("198.18.0.0", 15),
  cidr("198.51.100.0", 24),
  cidr("203.0.113.0", 24),
  cidr("224.0.0.0", 4),
  cidr("240.0.0.0", 4),
  cidr("255.255.255.255", 32),
];

function cidr(base: string, prefix: number): CidrV4 {
  const baseInt = ipv4ToInt(base);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return { base: baseInt & mask, mask };
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  if (value < 0) return true;
  return BLOCKED_V4_CIDRS.some((c) => (value & c.mask) === c.base);
}

function expandIPv6(ip: string): string {
  const stripped = ip.replace(/%.*$/, "");
  const [head, tail] = stripped.includes("::") ? stripped.split("::", 2) : [stripped, ""];
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = 8 - headParts.length - tailParts.length;
  const filler = Array.from({ length: missing < 0 ? 0 : missing }, () => "0");
  const all = [...headParts, ...filler, ...tailParts];
  return all.map((p) => p.padStart(4, "0").toLowerCase()).join(":");
}

function isPrivateIPv6(ip: string): boolean {
  const expanded = expandIPv6(ip);
  if (expanded === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  if (expanded === "0000:0000:0000:0000:0000:0000:0000:0000") return true;

  const firstByte = Number.parseInt(expanded.slice(0, 2), 16);
  if (Number.isNaN(firstByte)) return true;

  if ((firstByte & 0xfe) === 0xfc) return true;

  const firstHextet = Number.parseInt(expanded.split(":")[0], 16);
  if ((firstHextet & 0xffc0) === 0xfe80) return true;
  if ((firstHextet & 0xff00) === 0xff00) return true;

  if (expanded.startsWith("0000:0000:0000:0000:0000:ffff:")) {
    const tail = expanded.split(":").slice(-2).join("");
    const a = Number.parseInt(tail.slice(0, 2), 16);
    const b = Number.parseInt(tail.slice(2, 4), 16);
    const c = Number.parseInt(tail.slice(4, 6), 16);
    const d = Number.parseInt(tail.slice(6, 8), 16);
    if ([a, b, c, d].every((n) => !Number.isNaN(n))) {
      return isPrivateIPv4(`${a}.${b}.${c}.${d}`);
    }
  }

  return false;
}

function isPrivateIP(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(normalized)) return true;
  return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

export async function assertPublicUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfBlockedError("URL could not be parsed", "INVALID_URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfBlockedError(
      `Scheme ${parsed.protocol} is not allowed`,
      "UNSUPPORTED_SCHEME"
    );
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!hostname) {
    throw new SsrfBlockedError("URL has no hostname", "INVALID_URL");
  }

  if (isBlockedHostname(hostname)) {
    throw new SsrfBlockedError(
      `Hostname ${hostname} is not reachable`,
      "BLOCKED_HOSTNAME"
    );
  }

  const family = isIP(hostname);
  if (family !== 0) {
    if (isPrivateIP(hostname)) {
      throw new SsrfBlockedError(
        `IP ${hostname} is in a reserved range`,
        "PRIVATE_IP"
      );
    }
    return;
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SsrfBlockedError(
      `DNS lookup failed for ${hostname}`,
      "DNS_FAILED"
    );
  }

  if (addresses.length === 0) {
    throw new SsrfBlockedError(
      `DNS returned no records for ${hostname}`,
      "DNS_FAILED"
    );
  }

  for (const { address } of addresses) {
    if (isPrivateIP(address)) {
      throw new SsrfBlockedError(
        `${hostname} resolves to reserved IP ${address}`,
        "PRIVATE_IP"
      );
    }
  }
}
