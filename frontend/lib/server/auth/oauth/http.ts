import { NextResponse } from "next/server";

export function oauthCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, mcp-protocol-version",
    "Access-Control-Max-Age": "86400",
  };
}

export function oauthJson(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { ...oauthCorsHeaders(), ...(init?.headers ?? {}) },
  });
}

export function oauthError(
  error: string,
  errorDescription: string,
  status: number,
  headers?: Record<string, string>
): NextResponse {
  return oauthJson(
    { error, error_description: errorDescription },
    { status, headers }
  );
}

export function oauthPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: oauthCorsHeaders() });
}

export function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}
