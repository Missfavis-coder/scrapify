import { z } from "zod";

export const AssetPromptSchema = z.object({
  summary: z
    .string()
    .min(8)
    .max(180)
    .describe("One sentence describing what the asset depicts."),
  prompt: z
    .string()
    .min(60)
    .max(1400)
    .describe(
      "A complete, paste-ready text-to-image generation prompt that recreates the asset."
    ),
  negativePrompt: z
    .string()
    .min(0)
    .max(400)
    .describe("Comma-separated things to avoid in the generated image."),
  styleTags: z
    .array(z.string().min(1).max(40))
    .min(3)
    .max(10)
    .describe("Short style keywords describing the aesthetic."),
  aspectRatio: z
    .string()
    .min(2)
    .max(12)
    .describe("Recommended aspect ratio such as 1:1, 16:9, 1.91:1."),
});

export type AssetPromptObject = z.infer<typeof AssetPromptSchema>;
