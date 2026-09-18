import type { FaqEntry } from "@/lib/types/seo";

export const HOME_FAQ_SECTION = {
  eyebrow: "FAQ",
  title: "Questions, ",
  titleAccent: "answered",
  description:
    "Everything about turning a URL into a skill file your AI agent can actually use.",
} as const;

export const HOME_FAQ: FaqEntry[] = [
  {
    question: "What is a skill.md file?",
    answer:
      "A skill.md is a single structured Markdown file that gives an AI coding agent the context it needs to work in a specific style or against a specific tool — design tokens, API endpoints, library conventions, or documentation. You drop it into Claude Code, Cursor, or any MCP-aware agent and it reads it as grounded context.",
  },
  {
    question: "How do I turn a website into an agent skill?",
    answer:
      "Paste any URL — a docs site, design system, API reference, or knowledge base — into skillmd. We extract the meaningful structure, colors, components, and content, then generate a clean skill.md you can copy or download in seconds. No manual setup required.",
  },
  {
    question: "Which AI agents and tools does skillmd work with?",
    answer:
      "skillmd output works with Claude Code, Cursor, Windsurf, and any MCP-aware tool. The file is plain Markdown, so any agent that accepts context files or rules can use it directly.",
  },
  {
    question: "What's the difference between a skill.md and an MCP server?",
    answer:
      "An MCP server exposes live tools and data over a protocol. A skill.md is static, portable context you commit alongside your project. skillmd also ships an MCP endpoint, so you can either drop the file in directly or pull skills through MCP.",
  },
  {
    question: "What kinds of URLs can I generate a skill from?",
    answer:
      "Product sites and design systems (design mode), API references (api mode), SDKs and frameworks (library mode), and general documentation or knowledge bases (generic mode). skillmd auto-detects the right mode from the URL and you can override it.",
  },
  {
    question: "Is skillmd free to use?",
    answer:
      "Yes. You can browse the public registry and generate skills from any public URL for free, no limits on public generation. Pro unlocks inspiration imports, AI iteration, every mode, and the full CLI.",
  },
];
