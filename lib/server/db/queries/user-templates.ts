import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  userTemplates,
  type UserTemplateRow,
} from "@/lib/server/db/schema";

const USER_TEMPLATE_ID_LENGTH = 21;

interface CreateUserTemplateInput {
  userId: string;
  slug: string;
  repoUrl: string;
  branch?: string;
  description?: string;
}

export async function createUserTemplate(
  input: CreateUserTemplateInput
): Promise<UserTemplateRow> {
  const db = getDb();
  const [row] = await db
    .insert(userTemplates)
    .values({
      id: nanoid(USER_TEMPLATE_ID_LENGTH),
      userId: input.userId,
      slug: input.slug,
      repoUrl: input.repoUrl,
      branch: input.branch ?? null,
      description: input.description ?? null,
    })
    .returning();
  return row;
}

export async function listUserTemplates(
  userId: string
): Promise<UserTemplateRow[]> {
  const db = getDb();
  return db
    .select()
    .from(userTemplates)
    .where(eq(userTemplates.userId, userId))
    .orderBy(desc(userTemplates.createdAt));
}

export async function getUserTemplate(
  userId: string,
  slug: string
): Promise<UserTemplateRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(userTemplates)
    .where(
      and(eq(userTemplates.userId, userId), eq(userTemplates.slug, slug))
    )
    .limit(1);
  return row ?? null;
}

export async function getUserTemplateById(
  id: string,
  userId: string
): Promise<UserTemplateRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(userTemplates)
    .where(and(eq(userTemplates.id, id), eq(userTemplates.userId, userId)))
    .limit(1);
  return row ?? null;
}

interface UpdateUserTemplatePatch {
  repoUrl?: string;
  branch?: string | null;
  description?: string | null;
}

export async function updateUserTemplate(
  id: string,
  userId: string,
  input: Partial<UpdateUserTemplatePatch>
): Promise<UserTemplateRow | null> {
  const db = getDb();
  const set: Partial<typeof userTemplates.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.repoUrl !== undefined) set.repoUrl = input.repoUrl;
  if (input.branch !== undefined) set.branch = input.branch;
  if (input.description !== undefined) set.description = input.description;

  const [row] = await db
    .update(userTemplates)
    .set(set)
    .where(and(eq(userTemplates.id, id), eq(userTemplates.userId, userId)))
    .returning();
  return row ?? null;
}

export async function deleteUserTemplate(
  id: string,
  userId: string
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(userTemplates)
    .where(and(eq(userTemplates.id, id), eq(userTemplates.userId, userId)))
    .returning({ id: userTemplates.id });
  return deleted.length > 0;
}

export async function markTemplateValidated(
  id: string,
  error: string | null
): Promise<void> {
  const db = getDb();
  await db
    .update(userTemplates)
    .set({
      validatedAt: error === null ? new Date() : null,
      lastValidationError: error,
      updatedAt: new Date(),
    })
    .where(eq(userTemplates.id, id));
}
