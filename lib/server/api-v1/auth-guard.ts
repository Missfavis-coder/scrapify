import { NextResponse } from "next/server";
import { resolveBearerIdentity } from "@/lib/server/auth/bearer-identity";
import { recordUsageEventSafe } from "@/lib/server/db/queries/usage-events";
import { TRACKED_EVENTS } from "@/lib/constants/billing";
import { API_KEY_ERROR_CODES, V1_AUTH_COPY } from "@/lib/constants/api-keys";
import type { ApiErrorShape } from "@/lib/types/common";
import type { BearerIdentity } from "@/lib/types/auth";

interface GuardSuccess {
  ok: true;
  auth: BearerIdentity;
}

interface GuardFailure {
  ok: false;
  response: NextResponse;
}

export type V1AuthGuardResult = GuardSuccess | GuardFailure;

export async function guardV1Request(
  request: Request,
  endpoint: string
): Promise<V1AuthGuardResult> {
  const auth = await resolveBearerIdentity(request);
  if (!auth) {
    const hasHeader = Boolean(request.headers.get("authorization"));
    if (!hasHeader) {
      return {
        ok: false,
        response: jsonError(
          V1_AUTH_COPY.missing,
          API_KEY_ERROR_CODES.missing,
          401
        ),
      };
    }
    return {
      ok: false,
      response: jsonError(
        V1_AUTH_COPY.invalid,
        API_KEY_ERROR_CODES.invalid,
        401
      ),
    };
  }

  void recordUsageEventSafe({
    kind: TRACKED_EVENTS.apiKeyUsed,
    userId: auth.userId,
    ipHash: null,
    cookieKey: null,
    metadata: { endpoint, keyId: auth.keyId, source: auth.source },
  });

  return { ok: true, auth };
}

export function jsonError(
  error: string,
  code: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: ApiErrorShape = { error, code, details };
  return NextResponse.json(body, { status });
}
