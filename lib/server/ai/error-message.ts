import {
  isProtectionWallError,
  type ProtectionWallKind,
} from "@/lib/server/extractor/protection";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export const ERROR_CODES = {
  EMPTY_BODY: "EMPTY_BODY",
  TIMEOUT: "TIMEOUT",
  RATE_LIMIT: "RATE_LIMIT",
  ABORTED: "ABORTED",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
  SKILL_NOT_FOUND: "SKILL_NOT_FOUND",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode =
  | (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
  | `PROTECTION_WALL_${ProtectionWallKind}`;

const PROTECTION_USER_MESSAGES: Record<ProtectionWallKind, string> = {
  VERCEL_AUTH:
    "This URL is behind Vercel Authentication. Pass a public URL (production deployment with protection off).",
  CLOUDFLARE_ACCESS:
    "This URL is behind Cloudflare Access. We can't read pages that require SSO.",
  CLOUDFLARE_CHALLENGE:
    "Cloudflare's bot challenge blocked us. Try again in a minute or use a different URL.",
  NETLIFY_PASSWORD:
    "This URL is password-protected by Netlify. Pass a public URL.",
  GITHUB_PAGES_404:
    "This GitHub Pages URL returns a 404. Check the URL and try again.",
  BASIC_AUTH:
    "This URL requires HTTP Basic Auth. We can't read protected pages.",
  PAYWALL: "This page is behind a paywall or login wall. Try a public page.",
  BOT_CHALLENGE:
    "The site flagged us as a bot. Try again in a minute or use a different URL.",
};

const FRIENDLY_PATTERNS: Array<{
  test: RegExp;
  code: ErrorCode;
  message: string;
}> = [
  {
    test: /timed out|timeout|ETIMEDOUT/i,
    code: ERROR_CODES.TIMEOUT,
    message: "Generation timed out. Please try again.",
  },
  {
    test: /rate.?limit|quota|too many requests|429/i,
    code: ERROR_CODES.RATE_LIMIT,
    message: "Service is busy right now. Please try again in a moment.",
  },
  {
    test: /aborted/i,
    code: ERROR_CODES.ABORTED,
    message: "Generation was cancelled. Please try again.",
  },
  {
    test: /empty or near-empty body|near.?empty/i,
    code: ERROR_CODES.EMPTY_BODY,
    message: "We couldn't read enough from this page. Try a different URL.",
  },
  {
    test: /skill\.md not found/i,
    code: ERROR_CODES.SKILL_NOT_FOUND,
    message: "SKILL.md not found in this repo.",
  },
];

const SAFE_PREFIXES = [
  "Generation timed out",
  "Improve timed out",
  "Pipeline timed out",
];

export interface ClassifiedError {
  message: string;
  code: ErrorCode;
  detail: string;
}

export function classifyError(input: unknown): ClassifiedError {
  if (isProtectionWallError(input)) {
    return {
      message: PROTECTION_USER_MESSAGES[input.kind],
      code: `PROTECTION_WALL_${input.kind}` as ErrorCode,
      detail: `${input.label} detected at ${input.detectedAt}`,
    };
  }

  if (input instanceof Error) {
    return classifyMessage(input.message, input.stack ?? input.message);
  }
  if (typeof input === "string") {
    return classifyMessage(input, input);
  }
  return {
    message: GENERIC_MESSAGE,
    code: ERROR_CODES.UNKNOWN,
    detail: safeStringify(input),
  };
}

function classifyMessage(raw: string, detail: string): ClassifiedError {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      message: GENERIC_MESSAGE,
      code: ERROR_CODES.UNKNOWN,
      detail,
    };
  }

  for (const prefix of SAFE_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return {
        message: trimmed,
        code: ERROR_CODES.TIMEOUT,
        detail,
      };
    }
  }

  for (const { test, code, message: friendly } of FRIENDLY_PATTERNS) {
    if (test.test(trimmed)) {
      return { message: friendly, code, detail };
    }
  }

  return {
    message: GENERIC_MESSAGE,
    code: ERROR_CODES.UNKNOWN,
    detail,
  };
}

export function toUserFacingError(input: unknown): string {
  return classifyError(input).message;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
