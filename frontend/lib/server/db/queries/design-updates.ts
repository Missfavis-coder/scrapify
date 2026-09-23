import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import { designUpdateSubscribers } from "@/lib/server/db/schema";
import { DESIGN_UPDATES } from "@/lib/constants/design-updates";
import type { DesignUpdateSource } from "@/lib/types/design-updates";

export type SubscribeDesignUpdateResult =
  | { kind: "added" }
  | { kind: "already_subscribed" }
  | { kind: "reactivated" };

export interface SubscribeDesignUpdateInput {
  email: string;
  source: DesignUpdateSource;
  ipHash: string | null;
  userAgent: string | null;
}

export async function subscribeDesignUpdates(
  input: SubscribeDesignUpdateInput
): Promise<SubscribeDesignUpdateResult> {
  const db = getDb();
  const normalizedEmail = input.email.trim().toLowerCase();

  const [existing] = await db
    .select({
      id: designUpdateSubscribers.id,
      unsubscribedAt: designUpdateSubscribers.unsubscribedAt,
    })
    .from(designUpdateSubscribers)
    .where(eq(designUpdateSubscribers.email, normalizedEmail))
    .limit(1);

  if (existing) {
    if (!existing.unsubscribedAt) {
      return { kind: "already_subscribed" };
    }
    await db
      .update(designUpdateSubscribers)
      .set({
        unsubscribedAt: null,
        source: input.source,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        updatedAt: sql`NOW()`,
      })
      .where(eq(designUpdateSubscribers.id, existing.id));
    return { kind: "reactivated" };
  }

  await db.insert(designUpdateSubscribers).values({
    id: nanoid(DESIGN_UPDATES.idLength),
    email: normalizedEmail,
    source: input.source,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
  });
  return { kind: "added" };
}
