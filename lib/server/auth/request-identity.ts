import type { NextRequest } from "next/server";
import { hashIp } from "@/lib/utils/hash";
import { getServerEnv } from "@/lib/server/env";

export function getRequestIpHash(request: NextRequest): string {
  const env = getServerEnv();
  const header = request.headers.get("x-forwarded-for") ?? "0.0.0.0";
  const ip = header.split(",")[0].trim();
  return hashIp(ip, env.IP_HASH_SALT);
}
