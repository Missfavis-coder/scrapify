export const SITE = {
  name: "skillmd",
  legalName: "Tekcify",
  domain: "getskillmd.com",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://getskillmd.com",
  tagline: "Turn any website or docs into an agent skill",
  description:
    "Paste any website or documentation page — design system, API reference, or knowledge base — and get a structured skill file your AI agent (Claude Code, Cursor, and any MCP-aware tool) can drop in as context.",
  ogImage: "/api/og/default",
  logo: "/icon.svg",
  twitter: "@getskillmd",
  locale: "en_US",
  keywords: [
    "skill.md",
    "AI agent skills",
    "Claude Code skills",
    "Cursor rules",
    "agent context files",
    "MCP context",
    "design system to AI",
    "API docs to AI",
    "AI coding agents",
    "LLM context generator",
  ],
} as const;

export const NAV = {
  primary: [] as { label: string; href: string }[],
} as const;

export const SOCIAL = {
  github: "https://github.com/tekcify",
  instagram: "https://instagram.com/tekcify",
  x: "https://x.com/tekcify",
} as const;

export const BRAND = {
  builtBy: "tekcify",
  builtByUrl: "https://tekcify.com",
} as const;

export const INTEGRATION_LOGOS = {
  claude: "https://cdn.brandfetch.io/claude.ai/w/64/h/64",
  cursor: "https://cdn.brandfetch.io/cursor.com/w/64/h/64",
} as const;
