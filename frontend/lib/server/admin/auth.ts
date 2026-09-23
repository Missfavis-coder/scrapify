import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants/billing";
import { USER_ROLE } from "@/lib/constants/roles";
import { verifySessionToken } from "@/lib/server/auth/session";
import { findUserById } from "@/lib/server/db/queries/users";
import type { UserRow } from "@/lib/server/db/schema";

export async function getCurrentAdmin(): Promise<UserRow | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await findUserById(session.userId);
  if (!user || user.role !== USER_ROLE.admin) return null;
  return user;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  return (await getCurrentAdmin()) !== null;
}
