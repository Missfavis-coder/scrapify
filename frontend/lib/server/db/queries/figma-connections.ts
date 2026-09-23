import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import {
  userFigmaConnections,
  type UserFigmaConnectionRow,
} from "@/lib/server/db/schema";

export interface UpsertFigmaConnectionInput {
  userId: string;
  figmaUserId: string;
  figmaUserEmail: string | null;
  figmaUserHandle: string | null;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  scope: string;
  expiresAt: Date;
}

export async function upsertFigmaConnection(
  input: UpsertFigmaConnectionInput
): Promise<UserFigmaConnectionRow> {
  const db = getDb();
  const [row] = await db
    .insert(userFigmaConnections)
    .values({
      userId: input.userId,
      figmaUserId: input.figmaUserId,
      figmaUserEmail: input.figmaUserEmail,
      figmaUserHandle: input.figmaUserHandle,
      accessTokenEncrypted: input.accessTokenEncrypted,
      refreshTokenEncrypted: input.refreshTokenEncrypted,
      scope: input.scope,
      expiresAt: input.expiresAt,
    })
    .onConflictDoUpdate({
      target: userFigmaConnections.userId,
      set: {
        figmaUserId: input.figmaUserId,
        figmaUserEmail: input.figmaUserEmail,
        figmaUserHandle: input.figmaUserHandle,
        accessTokenEncrypted: input.accessTokenEncrypted,
        refreshTokenEncrypted: input.refreshTokenEncrypted,
        scope: input.scope,
        expiresAt: input.expiresAt,
        updatedAt: sql`now()`,
      },
    })
    .returning();
  return row;
}

export async function getFigmaConnection(
  userId: string
): Promise<UserFigmaConnectionRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userFigmaConnections)
    .where(eq(userFigmaConnections.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export interface UpdateFigmaTokensInput {
  userId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  scope?: string;
  expiresAt: Date;
}

export async function updateFigmaTokens(
  input: UpdateFigmaTokensInput
): Promise<void> {
  const db = getDb();
  await db
    .update(userFigmaConnections)
    .set({
      accessTokenEncrypted: input.accessTokenEncrypted,
      ...(input.refreshTokenEncrypted
        ? { refreshTokenEncrypted: input.refreshTokenEncrypted }
        : {}),
      ...(input.scope ? { scope: input.scope } : {}),
      expiresAt: input.expiresAt,
      updatedAt: sql`now()`,
    })
    .where(eq(userFigmaConnections.userId, input.userId));
}

export async function deleteFigmaConnection(userId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(userFigmaConnections)
    .where(eq(userFigmaConnections.userId, userId));
}
