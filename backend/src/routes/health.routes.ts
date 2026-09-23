import { Router, Request, Response } from "express";
import { db } from "../db/client.js";
import { sql } from "drizzle-orm";

const router: Router = Router();

router.get("/", async (_req: Request, res: Response) => {
  let dbStatus = "unknown";

  try {
    // Ping the database to confirm connectivity
    await db.execute(sql`SELECT 1`);
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime(),
  });
});

export default router;
