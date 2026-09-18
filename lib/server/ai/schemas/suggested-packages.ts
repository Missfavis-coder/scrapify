import { z } from "zod";
import {
  MAX_PACKAGE_EXTRAS,
  MAX_SUGGESTED_PACKAGES,
} from "@/lib/constants/suggested-packages";

export const SuggestedPackagesSchema = z.object({
  curated: z
    .array(z.string().min(1).max(60))
    .max(MAX_SUGGESTED_PACKAGES)
    .describe("Package names chosen ONLY from the provided catalog"),
  extras: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        purpose: z.string().min(3).max(120),
      })
    )
    .max(MAX_PACKAGE_EXTRAS)
    .describe(
      "Additional real, well-known npm packages not present in the catalog"
    ),
});

export type SuggestedPackagesSelection = z.infer<typeof SuggestedPackagesSchema>;

export const SuggestedPackagesGenerationSchema = z.object({
  curated: z
    .array(z.string())
    .describe("Package names chosen ONLY from the provided catalog"),
  extras: z
    .array(
      z.object({
        name: z.string(),
        purpose: z.string(),
      })
    )
    .describe("Additional real, well-known npm packages not in the catalog"),
});

export type SuggestedPackagesGeneration = z.infer<
  typeof SuggestedPackagesGenerationSchema
>;

export function sanitizeSuggestedPackages(
  raw: SuggestedPackagesGeneration
): SuggestedPackagesSelection {
  const curated = raw.curated
    .map((name) => name.trim().slice(0, 60))
    .filter((name) => name.length > 0)
    .slice(0, MAX_SUGGESTED_PACKAGES);
  const extras = raw.extras
    .map((extra) => ({
      name: extra.name.trim().slice(0, 60),
      purpose: extra.purpose.trim().slice(0, 120),
    }))
    .filter((extra) => extra.name.length > 0 && extra.purpose.length > 0)
    .slice(0, MAX_PACKAGE_EXTRAS);
  return { curated, extras };
}
