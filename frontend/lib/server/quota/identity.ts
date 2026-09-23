import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server/env";

export const VISITOR_COOKIE_NAME = "__skid";
const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
const VISITOR_ID_BYTES = 16;
const COOKIE_SIG_BYTES = 16;

const IP_KEY_PREFIX = "ipb:";
const COOKIE_KEY_PREFIX = "ck:";

export interface RequestIdentity {
  ipBlockKey: string;
  cookieKey: string;
  rawIpHash: string;
  cookieValue: string;
  cookieIsNew: boolean;
}

export function getRequestIdentity(request: NextRequest): RequestIdentity {
  const env = getServerEnv();
  const salt = env.IP_HASH_SALT;

  const rawIp = parseClientIp(request);
  const ipBlock = ipBlockOf(rawIp);
  const ipBlockHash = hash(`${salt}::ip::${ipBlock}`);
  const rawIpHash = hash(`${salt}::${rawIp}`);

  const existing = readVisitorCookie(request, salt);
  const cookieId = existing ?? generateVisitorId();
  const cookieIsNew = existing === null;
  const cookieValue = signCookie(cookieId, salt);
  const cookieHash = hash(`${salt}::ck::${cookieId}`);

  return {
    ipBlockKey: `${IP_KEY_PREFIX}${ipBlockHash}`,
    cookieKey: `${COOKIE_KEY_PREFIX}${cookieHash}`,
    rawIpHash,
    cookieValue,
    cookieIsNew,
  };
}

export function setVisitorCookie(response: NextResponse, value: string): void {
  const env = getServerEnv();
  response.cookies.set(VISITOR_COOKIE_NAME, value, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE_SECONDS,
  });
}

function parseClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "0.0.0.0";
}

function ipBlockOf(ip: string): string {
  if (ip.includes(":")) {
    const groups = ip.split(":");
    const prefix = groups.slice(0, 3).join(":");
    return `v6:${prefix.toLowerCase()}::`;
  }
  const octets = ip.split(".");
  if (octets.length !== 4) return `v4:${ip}`;
  return `v4:${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

function hash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 32);
}

function generateVisitorId(): string {
  return randomBytes(VISITOR_ID_BYTES).toString("base64url");
}

function signCookie(id: string, secret: string): string {
  const sig = createHmac("sha256", secret)
    .update(id)
    .digest("base64url")
    .slice(0, COOKIE_SIG_BYTES * 2);
  return `${id}.${sig}`;
}

function readVisitorCookie(
  request: NextRequest,
  secret: string,
): string | null {
  const value = request.cookies?.get?.(VISITOR_COOKIE_NAME)?.value;
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!id || !sig) return null;

  const expected = createHmac("sha256", secret)
    .update(id)
    .digest("base64url")
    .slice(0, COOKIE_SIG_BYTES * 2);

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  return timingSafeEqual(sigBuf, expBuf) ? id : null;
}
