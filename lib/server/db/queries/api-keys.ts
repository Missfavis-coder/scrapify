import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import { apiKeys, type ApiKeyRow } from "@/lib/server/db/schema";

const API_KEY_ID_LENGTH = 21;

interface CreateApiKeyInput {
  userId: string;
  label: string;
  keyHash: string;
  keyPrefix: string;
}

export async function createApiKey(
  input: CreateApiKeyInput
): Promise<ApiKeyRow> {
  const db = getDb();
  const [row] = await db
    .insert(apiKeys)
    .values({
      id: nanoid(API_KEY_ID_LENGTH),
      userId: input.userId,
      label: input.label,
      keyHash: input.keyHash,
      keyPrefix: input.keyPrefix,
    })
    .returning();
  return row;
}

export async function listApiKeys(userId: string): Promise<ApiKeyRow[]> {
  const db = getDb();
  return db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));
}

export async function findApiKeyByHash(
  hash: string
): Promise<ApiKeyRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), isNull(apiKeys.revokedAt)))
    .limit(1);
  return row ?? null;
}

export async function revokeApiKey(
  userId: string,
  id: string
): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.userId, userId),
        isNull(apiKeys.revokedAt)
      )
    )
    .returning({ id: apiKeys.id });
  return updated.length > 0;
}

export async function countActiveApiKeys(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));
  return row?.count ?? 0;
}

export async function findActiveApiKeyByIdForUser(
  userId: string,
  id: string
): Promise<ApiKeyRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.userId, userId),
        isNull(apiKeys.revokedAt)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function touchApiKey(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id));
}
