"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generationsService } from "@/lib/services/generations.service";
import { queryKeys } from "@/lib/query/query-keys";
import type { GenerationWithArtifacts } from "@/lib/types/generation";

export function useArchiveGeneration(id: string) {
  const queryClient = useQueryClient();
  const detailKey = queryKeys.generations.detail(id);

  return useMutation({
    mutationFn: (archive: boolean) =>
      generationsService.archive(id, { archive }),
    onMutate: async (archive) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const snapshot = queryClient.getQueryData<GenerationWithArtifacts>(detailKey);
      queryClient.setQueryData<GenerationWithArtifacts>(detailKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          archivedAt: archive ? new Date().toISOString() : null,
        };
      });
      return { snapshot };
    },
    onError: (_error, _archive, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(detailKey, context.snapshot);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(),
      });
    },
  });
}

export function useDeleteGeneration(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generationsService.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.generations.detail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.generations.public(),
      });
    },
  });
}

export function useAdminDeleteGeneration(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generationsService.adminRemove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.generations.detail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.generations.public(),
      });
    },
  });
}
