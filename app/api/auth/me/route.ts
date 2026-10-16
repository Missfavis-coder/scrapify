
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { user: null },
        { status: 200 },
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { user: null },
        { status: 200 },
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Unable to retrieve the current user." },
      { status: 500 },
    );
  }
}
