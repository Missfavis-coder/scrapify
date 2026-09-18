import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import { users, type UserRow } from "@/lib/server/db/schema";
import type { AuthUser, UserRole } from "@/lib/types/auth";

const USER_ID_LENGTH = 21;

export async function findUserById(id: string): Promise<UserRow | null> {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function findUserByTekcifyId(
  tekcifyId: string
): Promise<UserRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.tekcifyId, tekcifyId))
    .limit(1);
  return row ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return row ?? null;
}

interface CreateUserInput {
  email: string;
  tekcifyId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  cookieIdentity: string | null;
}

export async function createUser(input: CreateUserInput): Promise<UserRow> {
  const db = getDb();
  const [row] = await db
    .insert(users)
    .values({
      id: nanoid(USER_ID_LENGTH),
      email: input.email,
      tekcifyId: input.tekcifyId,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      cookieIdentity: input.cookieIdentity,
    })
    .returning();
  return row;
}

interface UpdateUserTekcifyProfileInput {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function updateUserTekcifyProfile(
  input: UpdateUserTekcifyProfileInput
): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({
      email: input.email,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.id));
}

export async function updateUserCookieIdentity(
  id: string,
  cookieIdentity: string
): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ cookieIdentity, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function updateUserDodoCustomerId(
  id: string,
  dodoCustomerId: string
): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ dodoCustomerId, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function setUserRole(id: string, role: UserRole): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    tekcifyId: row.tekcifyId,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    dodoCustomerId: row.dodoCustomerId,
    cookieIdentity: row.cookieIdentity,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
