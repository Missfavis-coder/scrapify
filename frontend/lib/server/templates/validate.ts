import { markTemplateValidated } from "@/lib/server/db/queries/user-templates";
import { logEvent, logError } from "@/lib/server/logger";
import {
  REQUIRED_TEMPLATE_PLACEHOLDERS,
  TEMPLATE_DEFAULT_BRANCH,
  TEMPLATE_REPO_URL_PATTERN,
  TEMPLATE_VALIDATION_ERRORS,
  TEMPLATE_VALIDATION_TIMEOUT_MS,
} from "@/lib/constants/templates";
import type { UserTemplateRow } from "@/lib/server/db/schema";

export interface ValidatedUserTemplate extends UserTemplateRow {
  validatedAt: Date | null;
  lastValidationError: string | null;
}

export async function validateUserTemplate(
  template: UserTemplateRow
): Promise<ValidatedUserTemplate> {
  const error = await runValidation(template);
  await markTemplateValidated(template.id, error);

  if (error === null) {
    logEvent("templates.validation.passed", {
      templateId: template.id,
    });
    return {
      ...template,
      validatedAt: new Date(),
      lastValidationError: null,
    };
  }

  logEvent("templates.validation.failed", {
    templateId: template.id,
    error,
  });
  return {
    ...template,
    validatedAt: null,
    lastValidationError: error,
  };
}

async function runValidation(template: UserTemplateRow): Promise<string | null> {
  const parsed = parseRepoUrl(template.repoUrl);
  if (!parsed) return TEMPLATE_VALIDATION_ERRORS.unreachable;

  const branch = template.branch ?? TEMPLATE_DEFAULT_BRANCH;
  const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(branch)}/package.json`;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    TEMPLATE_VALIDATION_TIMEOUT_MS
  );

  try {
    const response = await fetch(rawUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return TEMPLATE_VALIDATION_ERRORS.unreachable;
    }
    const body = await response.text();
    try {
      JSON.parse(body);
    } catch {
      return TEMPLATE_VALIDATION_ERRORS.invalidJson;
    }
    const hasPlaceholder = REQUIRED_TEMPLATE_PLACEHOLDERS.some((token) =>
      body.includes(token)
    );
    if (!hasPlaceholder) {
      return TEMPLATE_VALIDATION_ERRORS.missingPlaceholders;
    }
    return null;
  } catch (error) {
    logError("templates.validation.fetch_failed", error, {
      templateId: template.id,
    });
    return TEMPLATE_VALIDATION_ERRORS.unreachable;
  } finally {
    clearTimeout(timer);
  }
}

interface ParsedRepoUrl {
  owner: string;
  repo: string;
}

export function parseRepoUrl(repoUrl: string): ParsedRepoUrl | null {
  const match = repoUrl.match(TEMPLATE_REPO_URL_PATTERN);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}
