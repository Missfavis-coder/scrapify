"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { generationsService } from "@/lib/services/generations.service";
import type { GenerationWithArtifacts } from "@/lib/types/generation";

export function useGeneration(
  id: string,
  options?: Omit<UseQueryOptions<GenerationWithArtifacts>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: queryKeys.generations.detail(id),
    queryFn: () => generationsService.getById(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      const status = data?.status;
      if (status !== "done" && status !== "failed") return 1500;
      if (data?.lazyRefreshing) return 5000;
      return false;
    },
    ...options,
  });
}
