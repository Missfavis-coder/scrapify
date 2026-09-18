import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  webhookConfigs,
  type WebhookConfigRow,
} from "@/lib/server/db/schema";
import type { WebhookProvider } from "@/lib/types/webhooks";

const WEBHOOK_CONFIG_ID_LENGTH = 21;

export async function listWebhooksForUser(
  userId: string
): Promise<WebhookConfigRow[]> {
  const db = getDb();
  return db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.userId, userId))
    .orderBy(desc(webhookConfigs.createdAt));
}

export async function listWebhooksForGeneration(
  generationId: string
): Promise<WebhookConfigRow[]> {
  const db = getDb();
  return db
    .select()
    .from(webhookConfigs)
    .where(
      and(
        eq(webhookConfigs.generationId, generationId),
        eq(webhookConfigs.enabled, true)
      )
    )
    .orderBy(desc(webhookConfigs.createdAt));
}

interface CreateWebhookInput {
  userId: string;
  generationId: string;
  provider: WebhookProvider;
  target: string;
  secret?: string;
}

export async function createWebhook(
  input: CreateWebhookInput
): Promise<WebhookConfigRow> {
  const db = getDb();
  const [row] = await db
    .insert(webhookConfigs)
    .values({
      id: nanoid(WEBHOOK_CONFIG_ID_LENGTH),
      userId: input.userId,
      generationId: input.generationId,
      provider: input.provider,
      target: input.target,
      secret: input.secret ?? null,
    })
    .returning();
  return row;
}

interface UpdateWebhookPatch {
  target?: string;
  provider?: WebhookProvider;
  secret?: string | null;
  enabled?: boolean;
}

export async function updateWebhook(
  id: string,
  userId: string,
  input: Partial<UpdateWebhookPatch>
): Promise<WebhookConfigRow | null> {
  const db = getDb();
  const set: Partial<typeof webhookConfigs.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.target !== undefined) set.target = input.target;
  if (input.provider !== undefined) set.provider = input.provider;
  if (input.secret !== undefined) set.secret = input.secret;
  if (input.enabled !== undefined) set.enabled = input.enabled;

  const [row] = await db
    .update(webhookConfigs)
    .set(set)
    .where(
      and(eq(webhookConfigs.id, id), eq(webhookConfigs.userId, userId))
    )
    .returning();
  return row ?? null;
}

export async function deleteWebhook(
  id: string,
  userId: string
): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(webhookConfigs)
    .where(
      and(eq(webhookConfigs.id, id), eq(webhookConfigs.userId, userId))
    )
    .returning({ id: webhookConfigs.id });
  return deleted.length > 0;
}

export async function markDelivered(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(webhookConfigs)
    .set({ lastDeliveredAt: new Date() })
    .where(eq(webhookConfigs.id, id));
}
