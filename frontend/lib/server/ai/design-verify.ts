import { generateObject } from "ai";
import { z } from "zod";
import { extractFromUrl } from "@/lib/server/extractor/extract";
import { getHighQualityModel } from "@/lib/server/ai/gemini";
import {
  DesignVerificationSchema,
  type DesignVerification,
} from "@/lib/server/ai/schemas/design-verification";
import { withTimeout } from "@/lib/utils/timeout";
import { LIMITS } from "@/lib/constants/limits";
import { logEvent, logError, startTimer } from "@/lib/server/logger";

interface VerifyInput {
  brandScreenshotUrl: string | null;
  brandTokensJson: string;
  candidateUrl: string;
}

interface VerifyResult {
  verification: DesignVerification;
  candidateHost: string;
}

const SYSTEM_PROMPT = `You are a meticulous design-system reviewer. You compare a CANDIDATE web page (built by an AI agent) against a BRAND reference and its design tokens, then judge how faithfully the candidate reproduces the brand's visual language.

You receive:
- The brand design tokens as JSON (colors, typography, radii, shadows, spacing, motion, scheme).
- A screenshot of the BRAND reference page (when available).
- A screenshot of the CANDIDATE page.
- The candidate page's own extracted CSS tokens.

Judge fidelity across: color usage (primary placement, surfaces, contrast), typography (families, hierarchy, weights), spacing rhythm, border radii, shadow/elevation discipline, and overall atmosphere/mood. Penalize generic defaults (unbranded blues, default system fonts, uniform spacing) that ignore the brand tokens.

Score 0-100:
- 90+ = faithful reproduction of the brand
- 70-89 = recognizably on-brand with a few drifts
- 50-69 = partial; several token violations
- <50 = generic or off-brand

verdict: "match" (>=85), "close" (60-84), "off" (<60).
For each mismatch give a concrete aspect, the issue, and a specific fix that references the brand tokens. Be specific and do NOT fabricate details you cannot see.`;

export async function verifyDesignAgainstSkill(
  input: VerifyInput
): Promise<VerifyResult> {
  const elapsed = startTimer();

  const extracted = await withTimeout(
    extractFromUrl(input.candidateUrl),
    LIMITS.extractionWallClockMs,
    "candidate page extraction"
  );

  const candidateTokensJson = JSON.stringify(
    {
      colors: extracted.cssTokens.colors,
      primary: extracted.cssTokens.primary,
      fonts: extracted.cssTokens.fonts,
      fontSizes: extracted.cssTokens.fontSizes,
      fontWeights: extracted.cssTokens.fontWeights,
      borderRadii: extracted.cssTokens.borderRadii,
      shadows: extracted.cssTokens.shadows,
      spacing: extracted.cssTokens.spacing,
      colorScheme: extracted.cssTokens.colorScheme,
    },
    null,
    2
  );

  const brandImageBase64 = input.brandScreenshotUrl
    ? await fetchImageBase64(input.brandScreenshotUrl)
    : null;

  const content: VerifyContentPart[] = [
    {
      type: "text",
      text: `BRAND design tokens:\n\`\`\`json\n${input.brandTokensJson}\n\`\`\`\n\nCANDIDATE extracted tokens:\n\`\`\`json\n${candidateTokensJson}\n\`\`\``,
    },
  ];

  if (brandImageBase64) {
    content.push({ type: "text", text: "BRAND reference screenshot:" });
    content.push({ type: "image", image: brandImageBase64, mediaType: "image/png" });
  }
  content.push({ type: "text", text: "CANDIDATE page screenshot:" });
  content.push({
    type: "image",
    image: extracted.screenshotAboveBuffer.toString("base64"),
    mediaType: "image/png",
  });

  try {
    const result = await generateObject({
      model: getHighQualityModel(),
      schema: DesignVerificationSchema as unknown as z.ZodType<DesignVerification>,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      abortSignal: AbortSignal.timeout(LIMITS.generationTimeoutMs),
    });
    logEvent("ai.design-verify.done", {
      candidateUrl: input.candidateUrl,
      ms: elapsed(),
      score: result.object.score,
    });
    return { verification: result.object, candidateHost: extracted.host };
  } catch (error) {
    logError("ai.design-verify.failed", error, {
      candidateUrl: input.candidateUrl,
      ms: elapsed(),
    });
    throw error;
  }
}

type VerifyContentPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mediaType: string };

async function fetchImageBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(LIMITS.screenshotUploadMs),
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0) return null;
    return buffer.toString("base64");
  } catch {
    return null;
  }
}
