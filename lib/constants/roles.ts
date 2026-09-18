import type { UserRole } from "@/lib/types/auth";

export const USER_ROLE = {
  user: "user",
  admin: "admin",
} as const satisfies Record<UserRole, UserRole>;
