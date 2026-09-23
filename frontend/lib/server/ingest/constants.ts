export const SKILLS_SH_SITEMAP_URL = "https://skills.sh/sitemap.xml";
export const SKILLS_SH_BASE_URL = "https://skills.sh";

export const GITHUB_API_BASE = "https://api.github.com";
export const GITHUB_RAW_BASE = "https://raw.githubusercontent.com";

export const SKILL_FILE_NAMES = ["SKILL.md", "skill.md"] as const;

export const HOSTS_TO_IGNORE_AS_CANONICAL = new Set([
  "github.com",
  "www.github.com",
  "raw.githubusercontent.com",
  "gist.github.com",
  "skills.sh",
  "www.skills.sh",
  "anthropic.com",
  "www.anthropic.com",
  "claude.com",
  "www.claude.com",
  "anthropics.com",
  "vercel.com",
  "www.vercel.com",
  "npmjs.com",
  "www.npmjs.com",
  "nodejs.org",
  "developer.mozilla.org",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "wikipedia.org",
  "en.wikipedia.org",
  "stackoverflow.com",
]);

export const DEFAULT_BATCH_LIMIT = 50;
export const DEFAULT_CONCURRENCY = 4;
export const REQUEST_RETRIES = 2;
export const REQUEST_TIMEOUT_MS = 20_000;
