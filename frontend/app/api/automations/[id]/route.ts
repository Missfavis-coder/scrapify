
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/server/auth/session";
import {
  deleteAutomationByPublicId,
  getAutomationByPublicId,
  updateAutomationByPublicId,
} from "@/lib/server/db/queries/automation-service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const updateAutomationSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    url: z.string().url().optional(),
    instructions: z.string().trim().min(1).max(10_000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update.",
  });

export async function GET(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const automation = await getAutomationByPublicId(id, userId);

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Failed to retrieve automation:", error);

    return NextResponse.json(
      { error: "Failed to retrieve automation." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const parsed = updateAutomationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid update data.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    if (parsed.data.url !== undefined) {
      const parsedUrl = new URL(parsed.data.url);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: "Only HTTP and HTTPS URLs are supported." },
          { status: 400 },
        );
      }
    }

    const { id } = await params;
    const automation = await updateAutomationByPublicId(
      id,
      userId,
      parsed.data,
    );

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Failed to update automation:", error);

    return NextResponse.json(
      { error: "Failed to update automation." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext,
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const { id } = await params;
    const automation = await deleteAutomationByPublicId(id, userId);

    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete automation:", error);

    return NextResponse.json(
      { error: "Failed to delete automation." },
      { status: 500 },
    );
  }

}