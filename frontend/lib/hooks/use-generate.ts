"use client";

import {
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { generationsService } from "@/lib/services/generations.service";
import type {
  CreateGenerationDto,
  CreateGenerationResponse,
} from "@/lib/types/generation";

export function useGenerate(
  options?: UseMutationOptions<CreateGenerationResponse, Error, CreateGenerationDto>
) {
  return useMutation({
    mutationFn: (data: CreateGenerationDto) => generationsService.create(data),
    ...options,
  });
}
