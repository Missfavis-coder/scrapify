import { NextResponse, type NextRequest } from "next/server";
import {
  countInspirationsThisMonth,
  createInspirationGeneration,
} from "@/lib/server/db/queries/inspiration";
import { getUserEntitlements } from "@/lib/server/billing/entitlements";
import { recordUsageEventSafe } from "@/lib/server/db/queries/usage-events";
import { getRequestIpHash } from "@/lib/server/auth/request-identity";
import { readSessionPayload } from "@/lib/server/auth/session";
import { logError, logEvent } from "@/lib/server/logger";
import { BILLING, TRACKED_EVENTS } from "@/lib/constants/billing";
import { INSPIRATION_ERROR_CODES } from "@/lib/constants/inspiration";
import type { ApiErrorShape } from "@/lib/types/common";
import type { GenerationMode, SourceKind } from "@/lib/types/generation";
import type { SessionPayload } from "@/lib/types/auth";
import type { GenerationRow } from "@/lib/server/db/schema";
import type { UserEntitlements } from "@/lib/types/billing";

export interface AuthenticatedInspirationContext {
  userId: string;
  session: SessionPayload | null;
  ipHash: string;
  entitlements: UserEntitlements;
}

export type InspirationGate =
  | { ok: true; context: AuthenticatedInspirationContext }
  | { ok: false; response: NextResponse };

export async function gateInspirationRequest(
  request: NextRequest
): Promise<InspirationGate> {
  const session = await readSessionPayload(request);
  if (!session) {
    return {
      ok: false,
      response: jsonError(
        "Sign in to create inspirations.",
        INSPIRATION_ERROR_CODES.unauthenticated,
        401
      ),
    };
  }

  const entitlementGate = await checkInspirationEntitlement(session.userId);
  if (!entitlementGate.ok) return entitlementGate;

  return {
    ok: true,
    context: {
      userId: session.userId,
      session,
      ipHash: getRequestIpHash(request),
      entitlements: entitlementGate.entitlements,
    },
  };
}

export async function buildInspirationContextForUser(
  request: NextRequest,
  userId: string
): Promise<InspirationGate> {
  const entitlementGate = await checkInspirationEntitlement(userId);
  if (!entitlementGate.ok) return entitlementGate;

  return {
    ok: true,
    context: {
      userId,
      session: null,
      ipHash: getRequestIpHash(request),
      entitlements: entitlementGate.entitlements,
    },
  };
}

type EntitlementCheck =
  | { ok: true; entitlements: UserEntitlements }
  | { ok: false; response: NextResponse };

async function checkInspirationEntitlement(
  userId: string
): Promise<EntitlementCheck> {
  const entitlements = await getUserEntitlements(userId);
  if (entitlements.tier === "free") {
    const used = await countInspirationsThisMonth(userId);
    if (used >= BILLING.freeInspirationsPerMonth) {
      return {
        ok: false,
        response: jsonError(
          "Monthly inspiration limit reached on Free.",
          INSPIRATION_ERROR_CODES.quotaExceeded,
          402
        ),
      };
    }
  }
  return { ok: true, entitlements };
}

export interface PersistInspirationInput {
  context: AuthenticatedInspirationContext;
  sourceKind: SourceKind;
  sourceUrl: string;
  sourceHost: string;
  mode: GenerationMode;
  inspirationImageKey?: string | null;
  inspirationParentIds?: string[] | null;
  metadata?: Record<string, unknown>;
}

export async function persistInspiration(
  input: PersistInspirationInput
): Promise<GenerationRow> {
  const { userId, ipHash } = input.context;
  const row = await createInspirationGeneration({
    userId,
    ipHash,
    sourceKind: input.sourceKind,
    sourceUrl: input.sourceUrl,
    sourceHost: input.sourceHost,
    mode: input.mode,
    inspirationImageKey: input.inspirationImageKey ?? undefined,
    inspirationParentIds: input.inspirationParentIds ?? undefined,
  });

  await recordUsageEventSafe({
    kind: TRACKED_EVENTS.inspirationCreated,
    userId,
    ipHash,
    cookieKey: null,
    metadata: {
      generationId: row.id,
      sourceKind: input.sourceKind,
      ...(input.metadata ?? {}),
    },
  });

  logEvent("inspiration.created", {
    userId,
    generationId: row.id,
    sourceKind: input.sourceKind,
  });

  return row;
}

export function jsonError(
  message: string,
  code: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: ApiErrorShape = { error: message, code, details };
  return NextResponse.json(body, { status });
}

export function inspirationFatalError(
  scope: string,
  error: unknown,
  meta?: Record<string, unknown>
): NextResponse {
  logError(scope, error, meta);
  return jsonError(
    "Something went wrong creating that inspiration. Please try again.",
    INSPIRATION_ERROR_CODES.pipelineFailed,
    500
  );
}
