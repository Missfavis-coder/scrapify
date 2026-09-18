const ACRONYMS = new Set([
  "ai",
  "api",
  "sdk",
  "ui",
  "ux",
  "cli",
  "css",
  "html",
  "cdn",
  "aws",
  "gcp",
  "io",
  "js",
  "ts",
  "db",
  "ml",
  "llm",
]);

const SUFFIX_RE = /-(design|api|library|generic|reference|docs|sdk)$/i;

const TLD_TOKENS = new Set([
  "com",
  "org",
  "net",
  "co",
  "app",
  "dev",
  "xyz",
  "site",
  "tech",
  "info",
  "biz",
  "us",
  "uk",
  "eu",
  "me",
  "store",
  "online",
  "page",
  "cloud",
  "services",
]);

export function deriveBrandName(
  skillName: string | null | undefined,
  metaTitle: string | null | undefined,
  host: string | null | undefined
): string {
  if (skillName) {
    const base = skillName.replace(SUFFIX_RE, "");
    if (base.length > 0) {
      const tokens = base.split("-").filter(Boolean);
      while (
        tokens.length > 1 &&
        TLD_TOKENS.has(tokens[tokens.length - 1].toLowerCase())
      ) {
        tokens.pop();
      }
      if (tokens.length > 0) return tokens.map(titleCaseToken).join(" ");
    }
  }

  if (metaTitle) {
    const split = metaTitle.split(/\s*[-—–|·:]\s*/);
    const first = split[0]?.trim();
    if (first && first.length > 0 && first.length < 32) return first;
  }

  if (host) {
    const base = host.split(".")[0];
    if (base) return titleCaseToken(base);
  }

  return "Skill";
}

function titleCaseToken(token: string): string {
  if (!token) return "";
  if (ACRONYMS.has(token.toLowerCase())) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}
