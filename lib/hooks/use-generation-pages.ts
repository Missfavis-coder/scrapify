"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { generationsService } from "@/lib/services/generations.service";
import type { CrawledPageSummary } from "@/lib/types/generation";

const PAGES_STALE_TIME_MS = 5 * 60 * 1000;

export function useGenerationPages(id: string, enabled: boolean) {
  return useQuery<CrawledPageSummary[]>({
    queryKey: queryKeys.generations.pages(id),
    queryFn: async () => {
      const result = await generationsService.getPages(id);
      return result.pages;
    },
    enabled: enabled && Boolean(id),
    staleTime: PAGES_STALE_TIME_MS,
  });
}
