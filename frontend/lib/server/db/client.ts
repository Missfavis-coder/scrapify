import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@/lib/server/env";
import * as schema from "@/lib/server/db/schema";

let cached: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (cached) return cached;
  const env = getServerEnv();
  const client = postgres(env.DATABASE_URL, { max: 5, prepare: false });
  cached = drizzle(client, { schema });
  return cached;
}
