import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/server/db/client";
import {
  cliTokens,
  deviceAuthCodes,
  type CliTokenRow,
  type DeviceAuthCodeRow,
} from "@/lib/server/db/schema";

const CLI_TOKEN_ROW_ID_LENGTH = 21;
const DEVICE_AUTH_ROW_ID_LENGTH = 21;

interface InsertCliTokenInput {
  userId: string;
  tokenHash: string;
  label: string | null;
  expiresAt: Date | null;
}

export async function insertCliToken(input: InsertCliTokenInput): Promise<CliTokenRow> {
  const db = getDb();
  const [row] = await db
    .insert(cliTokens)
    .values({
      id: nanoid(CLI_TOKEN_ROW_ID_LENGTH),
      userId: input.userId,
      tokenHash: input.tokenHash,
      label: input.label,
      expiresAt: input.expiresAt,
    })
    .returning();
  return row;
}

export async function findCliTokenByHash(
  tokenHash: string
): Promise<CliTokenRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(cliTokens)
    .where(and(eq(cliTokens.tokenHash, tokenHash), isNull(cliTokens.revokedAt)))
    .limit(1);
  return row ?? null;
}

export async function touchCliTokenLastUsed(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(cliTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(cliTokens.id, id));
}

export async function revokeCliToken(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(cliTokens)
    .set({ revokedAt: new Date() })
    .where(eq(cliTokens.id, id));
}

interface InsertDeviceAuthCodeInput {
  userCode: string;
  deviceCode: string;
  expiresAt: Date;
}

export async function insertDeviceAuthCode(
  input: InsertDeviceAuthCodeInput
): Promise<DeviceAuthCodeRow> {
  const db = getDb();
  const [row] = await db
    .insert(deviceAuthCodes)
    .values({
      id: nanoid(DEVICE_AUTH_ROW_ID_LENGTH),
      userCode: input.userCode,
      deviceCode: input.deviceCode,
      status: "pending",
      expiresAt: input.expiresAt,
    })
    .returning();
  return row;
}

export async function findDeviceAuthCodeByUserCode(
  userCode: string
): Promise<DeviceAuthCodeRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(deviceAuthCodes)
    .where(eq(deviceAuthCodes.userCode, userCode))
    .limit(1);
  return row ?? null;
}

export async function findDeviceAuthCodeByDeviceCode(
  deviceCode: string
): Promise<DeviceAuthCodeRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(deviceAuthCodes)
    .where(eq(deviceAuthCodes.deviceCode, deviceCode))
    .limit(1);
  return row ?? null;
}

export async function approveDeviceAuthCode(
  id: string,
  userId: string
): Promise<void> {
  const db = getDb();
  await db
    .update(deviceAuthCodes)
    .set({
      userId,
      status: "approved",
      consumedAt: new Date(),
    })
    .where(eq(deviceAuthCodes.id, id));
}

export async function expireDeviceAuthCode(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(deviceAuthCodes)
    .set({ status: "expired" })
    .where(eq(deviceAuthCodes.id, id));
}
