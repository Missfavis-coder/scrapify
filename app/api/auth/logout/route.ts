import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/server/auth/cookies";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearSessionCookie();

    return NextResponse.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout failed:", error);

    return NextResponse.json(
      { error: "Logout failed. Please try again." },
      { status: 500 },
    );
  }
}