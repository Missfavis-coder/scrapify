import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/server/db/client";
import { generationArtifacts, generations } from "@/lib/server/db/schema";

export interface AdminRescueClaim {
  userId: string;
  sourceHost: string;
}

export async function markAdminRescuePending(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(generations)
    .set({ adminRescuedAt: new Date() })
    .where(and(eq(generations.id, id), isNotNull(generations.userId)));
}

export async function clearAdminRescuePending(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(generations)
    .set({ adminRescuedAt: null })
    .where(eq(generations.id, id));
}

export async function claimAdminRescueNotification(
  id: string
): Promise<AdminRescueClaim | null> {
  const db = getDb();
  const [row] = await db
    .update(generations)
    .set({ adminRescuedAt: null })
    .where(
      and(
        eq(generations.id, id),
        isNotNull(generations.adminRescuedAt),
        isNotNull(generations.userId),
        eq(generations.status, "done")
      )
    )
    .returning({
      userId: generations.userId,
      sourceHost: generations.sourceHost,
    });
  if (!row?.userId) return null;
  return { userId: row.userId, sourceHost: row.sourceHost };
}

export async function getRescuedSkillName(id: string): Promise<string | null> {
  const db = getDb();
  const [row] = await db
    .select({ skillName: generationArtifacts.skillName })
    .from(generationArtifacts)
    .where(eq(generationArtifacts.generationId, id));
  return row?.skillName ?? null;
}
