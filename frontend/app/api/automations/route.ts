
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { normalizeUrl } from "@/lib/utils/url";
import { db } from "@/lib/server/db";
import { automations } from "@/lib/server/db/schema";
import { getCurrentUserId } from "@/lib/server/auth/session";

export const runtime = "nodejs";

const createAutomationSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter a valid website URL")
    .transform((value, ctx) => {
      const normalized = normalizeUrl(value);

      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid website URL",
        });

        return z.NEVER;
      }

      return normalized.href;
    }),
  instructions: z
    .string()
    .trim()
    .min(1, "Describe what Scrapify should do")
    .max(10_000),
  name: z.string().trim().min(1).max(255).optional(),
});

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const items = await db
      .select()
      .from(automations)
      .where(eq(automations.userId, userId))
      .orderBy(desc(automations.createdAt));

    return NextResponse.json({ automations: items });
  } catch (error) {
    console.error("Failed to fetch automations:", error);

    return NextResponse.json(
      { error: "Failed to fetch automations" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parsed = createAutomationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid automation details",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { url, instructions, name } = parsed.data;
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS URLs are supported" },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(automations)
      .values({
        userId,
        url,
        instructions,
        name: name ?? parsedUrl.hostname,
        status: "draft",
      })
      .returning({
        id: automations.id,
        publicId: automations.publicId,
        userId: automations.userId,
        name: automations.name,
        url: automations.url,
        instructions: automations.instructions,
        description: automations.description,
        status: automations.status,
        createdAt: automations.createdAt,
        updatedAt: automations.updatedAt,
      });

    if (!created?.publicId) {
      console.error(
        "Automation was inserted without a public ID.",
        { automationId: created?.id },
      );

      return NextResponse.json(
        { error: "Automation was created without a public ID." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { automation: created },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    console.error("Failed to create automation:", error);

    return NextResponse.json(
      { error: "Failed to create automation" },
      { status: 500 },
    );
  }
}
