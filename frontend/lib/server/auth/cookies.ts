import "server-only";

import { cookies } from "next/headers";
import { createSessionToken } from "./token";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "scrapify_session";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export async function setSessionCookie(userId: string): Promise<void> {
  const token = createSessionToken(userId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}