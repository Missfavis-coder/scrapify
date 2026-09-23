import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  memberSpotlights,
  type MemberSpotlightRow,
} from "@/lib/server/db/schema";

const SPOTLIGHT_ID_LENGTH = 21;
const DEFAULT_SPOTLIGHT_LIMIT = 12;
const MAX_SPOTLIGHT_LIMIT = 50;

export async function listActiveSpotlights(
  limit?: number
): Promise<MemberSpotlightRow[]> {
  const db = getDb();
  const clamped = clampLimit(limit);
  return db
    .select()
    .from(memberSpotlights)
    .where(eq(memberSpotlights.active, true))
    .orderBy(desc(memberSpotlights.featuredAt))
    .limit(clamped);
}

interface CreateSpotlightInput {
  userId: string;
  generationId?: string;
  headline: string;
  description?: string;
  featuredAt: Date;
}

export async function createSpotlight(
  input: CreateSpotlightInput
): Promise<MemberSpotlightRow> {
  const db = getDb();
  const [row] = await db
    .insert(memberSpotlights)
    .values({
      id: nanoid(SPOTLIGHT_ID_LENGTH),
      userId: input.userId,
      generationId: input.generationId ?? null,
      headline: input.headline,
      description: input.description ?? null,
      featuredAt: input.featuredAt,
    })
    .returning();
  return row;
}

export async function deactivateSpotlight(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(memberSpotlights)
    .set({ active: false })
    .where(and(eq(memberSpotlights.id, id), eq(memberSpotlights.active, true)));
}

function clampLimit(limit: number | undefined): number {
  if (!limit || Number.isNaN(limit)) return DEFAULT_SPOTLIGHT_LIMIT;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_SPOTLIGHT_LIMIT);
}
