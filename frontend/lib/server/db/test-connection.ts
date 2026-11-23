
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
    max: 2,
  });

  pool.on("error", (error) => {
    console.error("Unexpected idle database client error:", error.message);
  });

  try {
    console.log("Testing PostgreSQL connection...");

    const result = await pool.query(`
      SELECT
        NOW() AS database_time,
        current_database() AS database_name,
        current_user AS database_user
    `);

    console.log("Database connection successful.");
    console.log("Connection details:", result.rows[0]);
    console.log("Pool state:", {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Diagnostic failed:", error);
  process.exitCode = 1;
});
