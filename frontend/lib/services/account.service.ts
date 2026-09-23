import { apiClient } from "@/lib/api";
import type { ChangePasswordPayload } from "@/lib/types/api";

export const accountService = {
  async changePassword(
    payload: ChangePasswordPayload,
  ): Promise<{ success?: boolean; message?: string }> {
    return apiClient.patch("/auth/change-password", payload);
  },

  async closeAccount(
    password: string,
  ): Promise<{ success?: boolean; message?: string }> {
    return apiClient.delete("/auth/account", {
      body: { password },
    });
  },
};
