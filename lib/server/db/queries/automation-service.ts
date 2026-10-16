
import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { automations } from "@/lib/server/db/schema";

export interface CreateAutomationInput {
  userId: string;
  url: string;
  instructions: string;
  name?: string;
  description?: string | null;
}

export async function createAutomation(input: CreateAutomationInput) {
  const [automation] = await db
    .insert(automations)
    .values({
      userId: input.userId,
      url: input.url,
      instructions: input.instructions,
      name: input.name ?? new URL(input.url).hostname,
      description: input.description ?? null,
      status: "draft",
    })
    .returning();

  return automation;
}

export async function getAutomationById(
  automationId: string,
  userId: string,
) {
  const [automation] = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.id, automationId),
        eq(automations.userId, userId),
      ),
    )
    .limit(1);

  return automation ?? null;
}

export async function getAutomationsByUser(userId: string) {
  return db
    .select()
    .from(automations)
    .where(eq(automations.userId, userId))
    .orderBy(desc(automations.createdAt));
}

export async function getAutomationByPublicId(
  publicId: string,
  userId: string,
) {
  const [automation] = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.publicId, publicId),
        eq(automations.userId, userId),
      ),
    )
    .limit(1);

  return automation ?? null;
}

export async function updateAutomationByPublicId(
  publicId: string,
  userId: string,
  input: {
    name?: string;
    description?: string | null;
    url?: string;
    instructions?: string;
    status?: string;
  },
) {
  const [automation] = await db
    .update(automations)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(automations.publicId, publicId),
        eq(automations.userId, userId),
      ),
    )
    .returning();

  return automation ?? null;
}

export async function deleteAutomationByPublicId(
  publicId: string,
  userId: string,
) {
  const [automation] = await db
    .delete(automations)
    .where(
      and(
        eq(automations.publicId, publicId),
        eq(automations.userId, userId),
      ),
    )
    .returning({ id: automations.id });

  return automation ?? null;
}


export async function updateAutomation(
  automationId: string,
  userId: string,
  input: {
    name?: string;
    description?: string | null;
    url?: string;
    instructions?: string;
    status?: string;
  },
) {
  const [automation] = await db
    .update(automations)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(automations.id, automationId),
        eq(automations.userId, userId),
      ),
    )
    .returning();

  return automation ?? null;
}

export async function deleteAutomation(
  automationId: string,
  userId: string,
) {
  const [automation] = await db
    .delete(automations)
    .where(
      and(
        eq(automations.id, automationId),
        eq(automations.userId, userId),
      ),
    )
    .returning({ id: automations.id });

  return automation ?? null;
}
