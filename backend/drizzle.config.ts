import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const databaseUrl = (globalThis as typeof globalThis & {
    process?: { env: Record<string, string | undefined> };
}).process?.env.DATABASE_URL;

export default defineConfig({
    schema: "./src/db/schema.ts",
    out: "./src/db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        url: databaseUrl!,
    },
});