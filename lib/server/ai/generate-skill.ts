import { type ModelMessage } from "ai";
import {
  getMetaModelChain,
  getRoutedBodyModelChain,
} from "@/lib/server/ai/gemini";
import {
  streamTextWithChain,
  generateObjectWithChain,
  type StreamWithChainResult,
} from "@/lib/server/ai/fallback";
import {
  getSystemPromptForMode,
  META_SYSTEM_PROMPT,
} from "@/lib/server/ai/prompts";
import { buildDesignUserMessage } from "@/lib/server/ai/prompts/design";
import { buildMotionUserMessage } from "@/lib/server/ai/prompts/motion";
import { buildPackagesSystemPrompt } from "@/lib/server/ai/prompts/packages";
import {
  SkillMetaGenerationSchema,
  sanitizeSkillMeta,
  type SkillMeta,
} from "@/lib/server/ai/schemas/skill-meta";
import {
  SuggestedPackagesGenerationSchema,
  sanitizeSuggestedPackages,
} from "@/lib/server/ai/schemas/suggested-packages";
import { buildSkillFile } from "@/lib/utils/markdown";
import {
  findCuratedPackage,
  MAX_SUGGESTED_PACKAGES,
} from "@/lib/constants/suggested-packages";
import { logError } from "@/lib/server/logger";
import { LIMITS } from "@/lib/constants/limits";
import type { GenerationMode } from "@/lib/types/generation";
import type { SuggestedPackage } from "@/lib/types/packages";
import type { SkillFile } from "@/lib/types/skill";
import type {
  CssTokens,
  ContentTokens,
  ExtractedPage,
} from "@/lib/types/extraction";

type UserMessageContent = Exclude<
  Extract<ModelMessage, { role: "user" }>["content"],
  string
>;
type UserContentPart = UserMessageContent[number];

interface GenerateBodyInput {
  mode: GenerationMode;
  url: string;
  pageTitle: string;
  cssTokens: CssTokens;
  contentTokens: ContentTokens;
  screenshotAboveBase64: string | null;
  screenshotFullBase64?: string | null;
  crawledPages?: ExtractedPage[];
  systemAddendum?: string;
}

export async function streamSkillBody(
  input: GenerateBodyInput
): Promise<StreamWithChainResult> {
  const baseSystem = getSystemPromptForMode(input.mode);
  const system = input.systemAddendum
    ? `${baseSystem}\n\n${input.systemAddendum}`
    : baseSystem;
  const messages = buildMessages(input);
  const contentLength = estimateContentLength(input);
  const chain = getRoutedBodyModelChain({
    mode: input.mode,
    contentLength,
  });

  return streamTextWithChain(chain, {
    system,
    messages,
    abortSignal: AbortSignal.timeout(LIMITS.generationTimeoutMs),
  });
}

interface MetaInput {
  mode: GenerationMode;
  url: string;
  pageTitle: string;
  body: string;
}

export async function generateSkillMeta(input: MetaInput): Promise<SkillMeta> {
  const raw = await generateObjectWithChain(getMetaModelChain(), {
    schema: SkillMetaGenerationSchema,
    system: META_SYSTEM_PROMPT,
    prompt: `Source URL: ${input.url}
Page title: ${input.pageTitle}
Mode: ${input.mode}

Skill body (truncated):
${input.body.slice(0, 2000)}

Produce the metadata object now.`,
    timeoutMs: LIMITS.metaGenerationTimeoutMs,
  });
  return sanitizeSkillMeta(raw);
}

interface SuggestedPackagesInput {
  mode: GenerationMode;
  body: string;
}

export async function generateSuggestedPackages(
  input: SuggestedPackagesInput
): Promise<SuggestedPackage[]> {
  const raw = await generateObjectWithChain(getMetaModelChain(), {
    schema: SuggestedPackagesGenerationSchema,
    system: buildPackagesSystemPrompt(input.mode),
    prompt: `Mode: ${input.mode}

Skill body (truncated):
${input.body.slice(0, 6000)}

Select the packages now.`,
    timeoutMs: LIMITS.metaGenerationTimeoutMs,
  });

  return resolveSuggestedPackages(sanitizeSuggestedPackages(raw));
}

function resolveSuggestedPackages(selection: {
  curated: string[];
  extras: { name: string; purpose: string }[];
}): SuggestedPackage[] {
  const resolved: SuggestedPackage[] = [];
  const seen = new Set<string>();

  for (const name of selection.curated) {
    const match = findCuratedPackage(name);
    if (!match) continue;
    const key = match.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    resolved.push({
      name: match.name,
      purpose: match.purpose,
      kind: match.kind,
      curated: true,
      command: match.command,
    });
  }

  for (const extra of selection.extras) {
    const key = extra.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    if (findCuratedPackage(extra.name)) continue;
    seen.add(key);
    resolved.push({
      name: extra.name.trim(),
      purpose: extra.purpose.trim(),
      kind: "dependency",
      curated: false,
    });
  }

  return resolved.slice(0, MAX_SUGGESTED_PACKAGES);
}

interface BuildSkillWithPackagesInput {
  mode: GenerationMode;
  meta: SkillMeta;
  body: string;
}

export async function buildSkillWithPackages(
  input: BuildSkillWithPackagesInput
): Promise<SkillFile> {
  const packages = await generateSuggestedPackages({
    mode: input.mode,
    body: input.body,
  }).catch((error) => {
    logError("skill.packages.failed", error, { mode: input.mode });
    return [] as SuggestedPackage[];
  });

  return buildSkillFile(input.meta, input.body, packages);
}

function estimateContentLength(input: GenerateBodyInput): number {
  if (input.crawledPages && input.crawledPages.length > 0) {
    return input.crawledPages.reduce(
      (sum, page) =>
        sum +
        (page.contentTokens.paragraphs.join("").length +
          page.contentTokens.headings.reduce((s, h) => s + h.text.length, 0) +
          page.contentTokens.codeBlocks.reduce((s, b) => s + b.snippet.length, 0)),
      0
    );
  }
  return JSON.stringify(input.contentTokens).length;
}

function buildMessages(input: GenerateBodyInput): ModelMessage[] {
  if (input.mode === "design" || input.mode === "motion") {
    const text =
      input.mode === "motion"
        ? buildMotionUserMessage({
            url: input.url,
            pageTitle: input.pageTitle,
            cssTokens: input.cssTokens,
            motion: input.contentTokens.motion ?? null,
          })
        : buildDesignUserMessage({
            url: input.url,
            pageTitle: input.pageTitle,
            cssTokens: input.cssTokens,
          });

    const imageParts: UserContentPart[] = [];
    if (input.screenshotAboveBase64) {
      imageParts.push({
        type: "image",
        image: input.screenshotAboveBase64,
        mediaType: "image/png",
      });
    }
    if (input.screenshotFullBase64) {
      imageParts.push({
        type: "image",
        image: input.screenshotFullBase64,
        mediaType: "image/png",
      });
    }

    if (imageParts.length > 0) {
      return [
        {
          role: "user",
          content: [{ type: "text", text }, ...imageParts],
        },
      ];
    }

    return [{ role: "user", content: text }];
  }

  if (input.crawledPages && input.crawledPages.length > 0) {
    const corpus = buildMultiPageCorpus(input.crawledPages);
    const sources = input.crawledPages
      .map((p, i) => `${i + 1}. ${p.pageTitle || p.finalUrl} — ${p.finalUrl}`)
      .join("\n");
    const text = `Source URL: ${input.url}
Page title: ${input.pageTitle}
Mode: ${input.mode}

Sources visited (${input.crawledPages.length} pages):
${sources}

Concatenated cleaned page content:
${corpus}

Now produce the skill body using ALL of the sources above.`;
    return [{ role: "user", content: text }];
  }

  const text = `Source URL: ${input.url}
Page title: ${input.pageTitle}
Mode: ${input.mode}

Extracted content:
\`\`\`json
${JSON.stringify(input.contentTokens, null, 2)}
\`\`\`

Now produce the skill body.`;

  return [{ role: "user", content: text }];
}

const REPEAT_DEDUPE_THRESHOLD = 3;

function buildMultiPageCorpus(pages: ExtractedPage[]): string {
  if (pages.length === 0) return "";
  const repeatedHeadings = collectRepeated(
    pages.map((p) => p.contentTokens.headings.map((h) => normalize(h.text)))
  );
  const repeatedParagraphs = collectRepeated(
    pages.map((p) => p.contentTokens.paragraphs.map(normalize))
  );

  const ordered = [...pages].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );

  const blocks: string[] = [];
  let total = 0;
  for (const page of ordered) {
    const rendered = renderPage(page, {
      droppedHeadings: repeatedHeadings,
      droppedParagraphs: repeatedParagraphs,
    });
    if (!rendered) continue;
    const remaining = LIMITS.crawlTotalCharCap - total;
    if (remaining <= 200) break;
    const trimmed =
      rendered.length > remaining ? rendered.slice(0, remaining) : rendered;
    blocks.push(trimmed);
    total += trimmed.length;
  }
  return blocks.join("\n\n");
}

interface RenderOpts {
  droppedHeadings: Set<string>;
  droppedParagraphs: Set<string>;
}

function renderPage(page: ExtractedPage, opts: RenderOpts): string {
  const c = page.contentTokens;
  const headingLines = c.headings
    .filter((h) => !opts.droppedHeadings.has(normalize(h.text)))
    .map((h) => `${"#".repeat(Math.min(h.level + 1, 6))} ${h.text}`);
  const paragraphLines = c.paragraphs.filter(
    (p) => !opts.droppedParagraphs.has(normalize(p))
  );
  const codeLines = c.codeBlocks.map(
    (b) => `\`\`\`${b.language}\n${b.snippet}\n\`\`\``
  );

  if (
    headingLines.length === 0 &&
    paragraphLines.length === 0 &&
    codeLines.length === 0
  ) {
    return "";
  }

  const body = [
    headingLines.join("\n"),
    paragraphLines.join("\n\n"),
    codeLines.join("\n\n"),
  ]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");

  const header = `---
# ${page.pageTitle || page.finalUrl}
${page.finalUrl}

${c.metaDescription ? `${c.metaDescription}\n\n` : ""}`;

  const full = `${header}${body}`.trim();
  return full.length > LIMITS.crawlPerPageCharCap
    ? full.slice(0, LIMITS.crawlPerPageCharCap)
    : full;
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function collectRepeated(perPage: string[][]): Set<string> {
  if (perPage.length < REPEAT_DEDUPE_THRESHOLD) return new Set();
  const counts = new Map<string, number>();
  for (const list of perPage) {
    const seen = new Set<string>();
    for (const item of list) {
      if (!item || item.length < 8) continue;
      if (seen.has(item)) continue;
      seen.add(item);
      counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  const out = new Set<string>();
  for (const [item, count] of counts) {
    if (count >= REPEAT_DEDUPE_THRESHOLD) out.add(item);
  }
  return out;
}
