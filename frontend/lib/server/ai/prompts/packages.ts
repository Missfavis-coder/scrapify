import type { GenerationMode } from "@/lib/types/generation";
import {
  curatedPackagesForMode,
  MAX_PACKAGE_EXTRAS,
} from "@/lib/constants/suggested-packages";

export function buildPackagesSystemPrompt(mode: GenerationMode): string {
  const catalog = curatedPackagesForMode(mode)
    .map((pkg) => `- ${pkg.name}: ${pkg.purpose}`)
    .join("\n");

  return `You recommend npm packages an AI coding agent should use to implement a skill well.

You are given the skill body. Decide which packages would genuinely help an agent build what the skill describes. Be selective — only include a package if the skill clearly benefits from it.

CATALOG (prefer these; reference them by exact name):
${catalog}

Return:
- curated: the exact names from the CATALOG above that fit this skill. Omit the field's items entirely if none apply. Never invent names here.
- extras: up to ${MAX_PACKAGE_EXTRAS} additional real, widely-used npm packages that are NOT in the catalog but are clearly relevant (for example an official SDK for the API or library the skill describes). Only list packages you are confident exist on npm. Skip anything speculative.

Rules:
- Quality over quantity. A focused list of 3-6 packages is better than a long one.
- Do not duplicate a catalog package inside extras.
- Each extra needs a short, concrete purpose (what the agent uses it for).`;
}
