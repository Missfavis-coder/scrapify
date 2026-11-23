
import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/server/auth/session";
import { getDatabasePoolStats, pool } from "@/lib/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const before = getDatabasePoolStats();

    await pool.query("SELECT 1");

    const after = getDatabasePoolStats();

    return NextResponse.json({
      connection: "successful",
      poolBefore: before,
      poolAfter: after,
    });
  } catch (error) {
    console.error("Database pool diagnostic failed:", error);

    return NextResponse.json(
      {
        connection: "failed",
        pool: getDatabasePoolStats(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
