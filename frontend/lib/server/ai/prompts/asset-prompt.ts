import type { AssetPromptKind } from "@/lib/types/asset-prompt";

export const ASSET_PROMPT_SYSTEM = `You are a senior prompt engineer for text-to-image models (Midjourney, DALL·E, Imagen, Stable Diffusion, Nano Banana).

You receive ONE brand asset image plus structured brand context. Your job is to reverse-engineer a single, production-grade prompt that a designer could paste into any image model to recreate this asset — or a fresh on-brand variant of it.

Return strict JSON with these fields:
- summary: one sentence naming what the asset is (e.g. "A wordmark logo on a dark background").
- prompt: the full paste-ready prompt. Be specific and concrete. Describe, in this order: subject and focal content, composition and layout, color palette (use the provided hex values when relevant), typography style if text is present, lighting and depth, texture and finish, art direction and rendering style, and the medium (vector logo, photographic OG banner, flat icon, UI screenshot, etc.). Write it as a flowing instruction, not a bullet list. Never mention the source brand name as something to copy verbatim unless the text is clearly part of the design; describe the look instead.
- negativePrompt: comma-separated artifacts to avoid (e.g. "blurry, watermark, distorted text, jpeg artifacts"). May be empty.
- styleTags: 3-10 short aesthetic keywords.
- aspectRatio: the best ratio for this asset kind.

Rules:
- Match what you actually SEE in the image first; use brand context only to enrich color/typography accuracy.
- Be deterministic and concise — no preamble, no markdown, no questions.
- Keep the prompt under 1200 characters.
- For favicons/logos prefer flat vector, transparent or solid background, crisp edges. For OG/Twitter images prefer wide marketing banner composition. For screenshots describe the UI layout, density, and chrome.`;

const KIND_GUIDANCE: Record<AssetPromptKind, string> = {
  favicon:
    "This is a favicon / app icon. Aim for a simple, scalable mark that reads at 16px. Aspect ratio 1:1.",
  logo:
    "This is a brand logo or wordmark. Describe the mark, lettering, and clear-space. Background is usually transparent or a single brand color.",
  "og:image":
    "This is an Open Graph share image. Treat it as a wide marketing banner, typically 1.91:1.",
  twitter:
    "This is a Twitter/X card image. Treat it as a wide social banner, typically 1.91:1 or 2:1.",
  screenshot:
    "This is a screenshot of a live web page. Describe the layout regions, content density, UI components, and visual hierarchy.",
  asset:
    "This is a generic brand asset. Infer its purpose from the image and describe it precisely.",
};

interface BuildAssetPromptInput {
  kind: AssetPromptKind;
  label: string;
  brandName: string | null;
  brandDescription: string | null;
  colors: string[];
  primary: string | null;
  fonts: string[];
}

export function buildAssetPromptUserText(input: BuildAssetPromptInput): string {
  const context = {
    asset: input.label,
    brand: input.brandName ?? "unknown",
    description: input.brandDescription ?? "unknown",
    primaryColor: input.primary ?? input.colors[0] ?? "unknown",
    palette: input.colors.slice(0, 8),
    fonts: input.fonts.slice(0, 4),
  };

  return `${KIND_GUIDANCE[input.kind]}

Brand context:
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

Study the attached image and produce the JSON prompt object that recreates this asset.`;
}
