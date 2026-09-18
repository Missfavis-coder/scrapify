import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import type { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/lib/server/env";
import {
  RETURNING_USER_COOKIE_MAX_AGE_SECONDS,
  RETURNING_USER_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  SESSION_REFRESH_THRESHOLD_SECONDS,
} from "@/lib/constants/billing";
import type { SessionPayload } from "@/lib/types/auth";

const ALGORITHM = "HS256";
const ISSUER = "getskillmd";

class SessionConfigError extends Error {
  code: string;
  constructor() {
    super("SESSION_SECRET is not configured (must be at least 32 chars).");
    this.name = "SessionConfigError";
    this.code = "SESSION_NOT_CONFIGURED";
  }
}

function getSecretKey(): Uint8Array {
  const env = getServerEnv();
  if (!env.SESSION_SECRET) {
    throw new SessionConfigError();
  }
  return new TextEncoder().encode(env.SESSION_SECRET);
}

function buildCookieOptions(maxAge: number) {
  const env = getServerEnv();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function createSessionToken(
  userId: string,
  sid: string = nanoid()
): Promise<string> {
  const key = getSecretKey();
  const token = await new SignJWT({ userId, sid })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setSubject(userId)
    .setJti(sid)
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(key);
  return token;
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      algorithms: [ALGORITHM],
    });
    if (typeof payload.userId !== "string" || payload.userId.length === 0) {
      return null;
    }
    return {
      userId: payload.userId,
      sid: typeof payload.sid === "string" ? payload.sid : undefined,
      iat: typeof payload.iat === "number" ? payload.iat : undefined,
      exp: typeof payload.exp === "number" ? payload.exp : undefined,
    };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    buildCookieOptions(SESSION_MAX_AGE_SECONDS)
  );
}

export function setReturningCookie(response: NextResponse): void {
  const env = getServerEnv();
  response.cookies.set(RETURNING_USER_COOKIE_NAME, "1", {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: RETURNING_USER_COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...buildCookieOptions(0),
    maxAge: 0,
  });
}

export async function readSessionPayload(
  request: NextRequest
): Promise<SessionPayload | null> {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function shouldRefreshSession(payload: SessionPayload): boolean {
  if (!payload.iat) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
  return ageSeconds >= SESSION_REFRESH_THRESHOLD_SECONDS;
}

export async function refreshSessionCookieIfNeeded(
  request: NextRequest,
  response: NextResponse
): Promise<boolean> {
  const token = request.cookies?.get?.(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;
  const payload = await verifySessionToken(token);
  if (!payload) return false;
  if (!shouldRefreshSession(payload)) return false;
  const next = await createSessionToken(payload.userId, payload.sid);
  setSessionCookie(response, next);
  return true;
}
