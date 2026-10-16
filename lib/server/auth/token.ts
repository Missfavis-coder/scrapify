import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be configured with at least 32 characters",
    );
  }

  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    expiresAt:
      Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export async function verifySessionToken(
  token: string,
): Promise<{ userId: string } | null> {
  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, suppliedSignature] = parts;

    if (!encodedPayload || !suppliedSignature) {
      return null;
    }

    const expectedSignature = sign(encodedPayload);
    const expectedBuffer = Buffer.from(expectedSignature);
    const suppliedBuffer = Buffer.from(suppliedSignature);

    if (
      expectedBuffer.length !== suppliedBuffer.length ||
      !timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;

    if (
      typeof payload.userId !== "string" ||
      !payload.userId ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
}