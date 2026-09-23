import { and, eq, gte, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import { usageEvents } from "@/lib/server/db/schema";

const EVENT_ID_LENGTH = 21;

interface RecordEventInput {
  kind: string;
  userId: string | null;
  ipHash: string | null;
  cookieKey: string | null;
  metadata: Record<string, unknown> | null;
}

export async function recordUsageEvent(input: RecordEventInput): Promise<void> {
  const db = getDb();
  await db.insert(usageEvents).values({
    id: nanoid(EVENT_ID_LENGTH),
    userId: input.userId,
    ipHash: input.ipHash,
    cookieKey: input.cookieKey,
    kind: input.kind,
    metadata: input.metadata,
  });
}

export async function recordUsageEventSafe(input: RecordEventInput): Promise<void> {
  try {
    await recordUsageEvent(input);
  } catch {
  }
}

export async function countUserEventsSince(
  userId: string,
  kind: string,
  since: Date
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.kind, kind),
        gte(usageEvents.createdAt, since)
      )
    );
  return row?.count ?? 0;
}

export async function countCookieEventsSince(
  cookieKey: string,
  kind: string,
  since: Date
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.cookieKey, cookieKey),
        eq(usageEvents.kind, kind),
        gte(usageEvents.createdAt, since)
      )
    );
  return row?.count ?? 0;
}

export async function countUserEventsByMetadataKey(
  userId: string,
  kind: string,
  metadataKey: string,
  metadataValue: string
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.kind, kind),
        sql`${usageEvents.metadata} ->> ${metadataKey} = ${metadataValue}`
      )
    );
  return row?.count ?? 0;
}

export async function countUserEventsByMetadataKeySince(
  userId: string,
  kind: string,
  metadataKey: string,
  metadataValue: string,
  since: Date
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.kind, kind),
        gte(usageEvents.createdAt, since),
        sql`${usageEvents.metadata} ->> ${metadataKey} = ${metadataValue}`
      )
    );
  return row?.count ?? 0;
}
