import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/server/db/schema";

let cachedClient: ReturnType<typeof postgres> | null = null;
let cachedDb: ReturnType<typeof drizzle> | null = null;

export function getIngestDb() {
  if (cachedDb) return cachedDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  cachedClient = postgres(url, { max: 5, prepare: false });
  cachedDb = drizzle(cachedClient, { schema });
  return cachedDb;
}

export async function closeIngestDb(): Promise<void> {
  if (cachedClient) {
    await cachedClient.end({ timeout: 5 });
    cachedClient = null;
    cachedDb = null;
  }
}
