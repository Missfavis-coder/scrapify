import "server-only";

import { cookies } from "next/headers";
import { verifySessionToken } from "./token";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "scrapify_session";

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const session = await verifySessionToken(token);
    return session?.userId ?? null;
  } catch {
    return null;
  }
}