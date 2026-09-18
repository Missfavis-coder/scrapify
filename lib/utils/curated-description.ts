const PLACEHOLDER_RE = /^[\s>\-_*#`'"]*$/;

interface DescriptionContext {
  description: string | null | undefined;
  name: string;
  owner: string;
  repo: string;
  canonicalHost?: string | null;
  kind?: "docs" | "methodology" | "tooling" | "pending";
}

const KIND_FALLBACK = {
  docs: "Drop-in skill.md.",
  methodology: "Methodology skill.md.",
  tooling: "Tooling skill.md.",
  pending: "Drop-in skill.md.",
} as const;

export function effectiveDescription(ctx: DescriptionContext): string {
  const raw = (ctx.description ?? "").trim();
  if (raw.length > 0 && !PLACEHOLDER_RE.test(raw)) return raw;

  const host = ctx.canonicalHost?.trim();
  if (host) {
    return `Drop-in skill.md for ${host}.`;
  }
  if (ctx.kind && ctx.kind !== "pending") return KIND_FALLBACK[ctx.kind];
  return `Drop-in skill.md from ${ctx.owner}/${ctx.repo}.`;
}
