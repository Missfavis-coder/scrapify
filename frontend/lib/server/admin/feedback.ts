import { and, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { generations } from "@/lib/server/db/schema";
import { ADMIN } from "@/lib/constants/admin";

export async function clearAdminFeedback(ids: string[]): Promise<number> {
  const uniqueIds = [
    ...new Set(
      ids.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 64)
    ),
  ].slice(0, ADMIN.feedbackDeleteBatchLimit);

  if (uniqueIds.length === 0) return 0;

  const db = getDb();
  const rows = await db
    .update(generations)
    .set({ feedback: null, updatedAt: new Date() })
    .where(and(inArray(generations.id, uniqueIds), isNotNull(generations.feedback)))
    .returning({ id: generations.id });

  return rows.length;
}
