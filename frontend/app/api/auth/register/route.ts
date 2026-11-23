import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { setSessionCookie } from "@/lib/server/auth/cookies";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(72),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid registration details",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Unable to register with these details." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
      });

    if (!user) {
      throw new Error("User creation failed");
    }

    await setSessionCookie(user.id);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    console.error("Registration failed:", error);

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 },
    );
  }
}