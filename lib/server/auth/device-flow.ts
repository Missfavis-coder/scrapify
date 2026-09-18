import { randomBytes } from "node:crypto";
import {
  approveDeviceAuthCode,
  expireDeviceAuthCode,
  findDeviceAuthCodeByDeviceCode,
  findDeviceAuthCodeByUserCode,
  insertDeviceAuthCode,
} from "@/lib/server/db/queries/cli-tokens";
import { findUserById, toAuthUser } from "@/lib/server/db/queries/users";
import { issueCliToken } from "@/lib/server/auth/cli-token";
import {
  DEVICE_CODE_POLL_INTERVAL_SECONDS,
  DEVICE_CODE_TTL_SECONDS,
} from "@/lib/constants/billing";
import { getPublicSiteUrl } from "@/lib/utils/url";
import type {
  DeviceCodeStartResult,
  DevicePollResult,
} from "@/lib/types/auth";

const USER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const USER_CODE_LENGTH = 8;
const DEVICE_CODE_BYTES = 32;

export async function createDeviceCode(): Promise<DeviceCodeStartResult> {
  const userCode = formatUserCode(generateUserCode());
  const deviceCode = randomBytes(DEVICE_CODE_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_SECONDS * 1000);

  await insertDeviceAuthCode({ userCode, deviceCode, expiresAt });

  const verificationUri = `${getPublicSiteUrl()}/auth/device`;
  const verificationUriComplete = `${getPublicSiteUrl()}/auth/device/${encodeURIComponent(userCode)}`;

  return {
    userCode,
    deviceCode,
    verificationUri,
    verificationUriComplete,
    expiresIn: DEVICE_CODE_TTL_SECONDS,
    interval: DEVICE_CODE_POLL_INTERVAL_SECONDS,
  };
}

interface ApproveDeviceCodeInput {
  userCode: string;
  userId: string;
}

export async function approveDeviceCode(
  input: ApproveDeviceCodeInput
): Promise<{ approved: boolean; reason?: string }> {
  const normalized = normalizeUserCode(input.userCode);
  const row = await findDeviceAuthCodeByUserCode(normalized);
  if (!row) return { approved: false, reason: "Code not found" };
  if (row.status !== "pending") {
    return { approved: false, reason: "Code already used" };
  }
  if (row.expiresAt < new Date()) {
    await expireDeviceAuthCode(row.id);
    return { approved: false, reason: "Code expired" };
  }
  await approveDeviceAuthCode(row.id, input.userId);
  return { approved: true };
}

export async function pollDeviceCode(
  deviceCode: string
): Promise<DevicePollResult> {
  const row = await findDeviceAuthCodeByDeviceCode(deviceCode);
  if (!row) return { status: "denied" };
  if (row.expiresAt < new Date()) {
    if (row.status === "pending") await expireDeviceAuthCode(row.id);
    return { status: "expired" };
  }
  if (row.status === "pending") return { status: "pending" };
  if (row.status === "expired") return { status: "expired" };
  if (row.status === "approved" && row.userId) {
    const user = await findUserById(row.userId);
    if (!user) return { status: "denied" };
    const issued = await issueCliToken({
      userId: user.id,
      label: "CLI device login",
      ttlMs: null,
    });
    const auth = toAuthUser(user);
    return {
      status: "approved",
      token: issued.token,
      user: {
        id: auth.id,
        email: auth.email,
        displayName: auth.displayName,
      },
    };
  }
  return { status: "denied" };
}

function generateUserCode(): string {
  const bytes = randomBytes(USER_CODE_LENGTH);
  let code = "";
  for (let index = 0; index < USER_CODE_LENGTH; index += 1) {
    code += USER_CODE_ALPHABET[bytes[index] % USER_CODE_ALPHABET.length];
  }
  return code;
}

function formatUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeUserCode(code: string): string {
  const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== USER_CODE_LENGTH) return code.toUpperCase();
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
}
