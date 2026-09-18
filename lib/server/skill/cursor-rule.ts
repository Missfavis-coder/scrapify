interface CursorRuleInput {
  slug: string;
  description: string | null;
  skillMd: string;
}

export function buildCursorRule(input: CursorRuleInput): string {
  const description = input.description?.trim() ?? input.slug;
  const body = stripFrontmatter(input.skillMd).trimStart();
  const lines = [
    "---",
    `description: ${escapeYaml(description)}`,
    "globs:",
    '  - "**/*"',
    "alwaysApply: false",
    "---",
    "",
    body,
  ];
  return lines.join("\n");
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---\n[\s\S]*?\n---\n*/, "");
}

function escapeYaml(value: string): string {
  if (/[":\n]/.test(value)) {
    return `"${value.replace(/"/g, '\\"').replace(/\n/g, " ")}"`;
  }
  return value;
}
