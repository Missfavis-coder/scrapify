"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generationsService } from "@/lib/services/generations.service";
import { queryKeys } from "@/lib/query/query-keys";
import type { GenerationWithArtifacts } from "@/lib/types/generation";

export function useSetGenerationVisibility(id: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.generations.detail(id);

  return useMutation({
    mutationFn: (isPublic: boolean) =>
      generationsService.setVisibility(id, { isPublic }),
    onMutate: async (isPublic) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<GenerationWithArtifacts>(detailKey);
      queryClient.setQueryData<GenerationWithArtifacts>(detailKey, (current) => {
        if (!current) return current;
        return { ...current, isPublic };
      });
      return { snapshot };
    },
    onError: (_error, _isPublic, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(detailKey, context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.generations.public(),
      });
    },
  });
}
