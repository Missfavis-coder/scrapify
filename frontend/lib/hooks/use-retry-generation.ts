"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generationsService } from "@/lib/services/generations.service";
import { queryKeys } from "@/lib/query/query-keys";

export function useRetryGeneration(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generationsService.retry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.generations.detail(id),
      });
    },
  });
}
