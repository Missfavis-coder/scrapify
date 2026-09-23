import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { bookmarks, generations } from "@/lib/server/db/schema";

export type WebhookGenerationAccess =
  | { ok: true; generationId: string }
  | { ok: false; reason: "not_found" | "forbidden" };

export async function resolveWebhookAccess(
  generationId: string,
  userId: string
): Promise<WebhookGenerationAccess> {
  const db = getDb();
  const [row] = await db
    .select({ id: generations.id, ownerId: generations.userId })
    .from(generations)
    .where(eq(generations.id, generationId))
    .limit(1);

  if (!row) return { ok: false, reason: "not_found" };
  if (row.ownerId === userId) return { ok: true, generationId: row.id };

  const [bookmark] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(
      and(
        eq(bookmarks.userId, userId),
        eq(bookmarks.generationId, generationId)
      )
    )
    .limit(1);

  if (bookmark) return { ok: true, generationId: row.id };
  return { ok: false, reason: "forbidden" };
}
