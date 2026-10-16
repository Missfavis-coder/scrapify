"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { automationService } from "@/lib/services/automation.service";

export function useAutomation(publicId: string) {
  return useQuery({
    queryKey: ["automations", "detail", publicId],
    queryFn: () => automationService.getByPublicId(publicId),
    enabled: Boolean(publicId),
    staleTime: 30_000,
    retry: false,
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: automationService.create,
    onSuccess: (automation) => {
      queryClient.setQueryData(
        ["automations", "detail", automation.publicId],
        automation,
      );

      void queryClient.invalidateQueries({
        queryKey: ["automations"],
      });
    },
  });
}