import { z } from "zod";

export const DesignVerificationSchema = z.object({
  score: z.number().min(0).max(100),
  verdict: z.enum(["match", "close", "off"]),
  matches: z.array(z.string()).max(12),
  mismatches: z
    .array(
      z.object({
        aspect: z.string(),
        issue: z.string(),
        fix: z.string(),
      })
    )
    .max(12),
  suggestions: z.array(z.string()).max(8),
});

export type DesignVerification = z.infer<typeof DesignVerificationSchema>;
