import {
  PiPaintRollerBold,
  PiCodeBold,
  PiPackageBold,
  PiBookOpenBold,
  PiCubeBold,
  PiDribbbleLogoBold,
  PiPinterestLogoBold,
  PiFigmaLogoBold,
  PiImageSquareBold,
  PiMagicWandBold,
  PiLightningBold,
  PiCommandBold,
  PiCompassBold,
} from "react-icons/pi";
import type { IconType } from "react-icons";

interface LandingSection {
  eyebrow: string;
  title: string;
  titleAccent: string;
  titleTail?: string;
  description: string;
}

export const LANDING_MODES: LandingSection & {
  cards: Array<{
    icon: IconType;
    label: string;
    description: string;
    example: string;
  }>;
} = {
  eyebrow: "Modes",
  title: "Five flavors of",
  titleAccent: "skill",
  description:
    "We pick the right one from the URL. Override it if we get it wrong.",
  cards: [
    {
      icon: PiPaintRollerBold,
      label: "Design system",
      description:
        "Colors, typography, components, spacing — pulled from any product or marketing site.",
      example: "stripe.com",
    },
    {
      icon: PiCubeBold,
      label: "Motion / WebGL",
      description:
        "Scroll choreography, WebGL and 3D scenes, video and media assets, plus the animation stack to rebuild it.",
      example: "lusion.co",
    },
    {
      icon: PiCodeBold,
      label: "API docs",
      description:
        "Endpoints, auth, request shapes, error patterns, and code samples.",
      example: "paystack.com/docs",
    },
    {
      icon: PiPackageBold,
      label: "Library / SDK",
      description:
        "Install, core API, common patterns, and the gotchas that bite first.",
      example: "tanstack.com/query",
    },
    {
      icon: PiBookOpenBold,
      label: "Generic",
      description:
        "Anything else — headings, key concepts, code samples, structured for context.",
      example: "any docs URL",
    },
  ],
};

export const LANDING_IMPORTS: LandingSection & {
  sources: Array<{ icon: IconType; label: string; helper: string }>;
  bullets: string[];
} = {
  eyebrow: "Inspirations",
  title: "Import a vibe from",
  titleAccent: "anywhere",
  description:
    "Pull palette, type, and feel from Dribbble shots, Pinterest pins, Figma files, or any image. We turn it into a private skill on your dashboard.",
  sources: [
    {
      icon: PiDribbbleLogoBold,
      label: "Dribbble",
      helper: "Paste a shot URL",
    },
    {
      icon: PiPinterestLogoBold,
      label: "Pinterest",
      helper: "Paste a pin link",
    },
    {
      icon: PiFigmaLogoBold,
      label: "Figma",
      helper: "Paste a file link",
    },
    {
      icon: PiImageSquareBold,
      label: "Image upload",
      helper: "PNG, JPEG, or WebP",
    },
  ],
  bullets: [
    "Private to your dashboard — public registry stays public-URL only",
    "Multi-source merge — blend up to 5 inspirations into one skill",
    "Same skill.md output your agent already reads",
  ],
};

export const LANDING_CLI: LandingSection & {
  installCommand: string;
  runLines: Array<{ kind: "prompt" | "out"; text: string }>;
  ides: Array<{ icon: IconType; label: string; path: string }>;
} = {
  eyebrow: "CLI",
  title: "Drop into any IDE in",
  titleAccent: "one command",
  description:
    "Scaffold a themed project, or add a skill to an existing repo. Works with Claude Code, Cursor, and Windsurf out of the box.",
  installCommand: "npx @getskillmd/cli init stripe my-app",
  runLines: [
    { kind: "prompt", text: "$ npx @getskillmd/cli init stripe my-app" },
    { kind: "out", text: "✓ Cloned starter (next-app)" },
    { kind: "out", text: "✓ Applied stripe design tokens" },
    { kind: "out", text: "✓ Wrote .claude/skills/stripe/SKILL.md" },
    { kind: "out", text: "✓ Wrote .cursor/rules/stripe.mdc" },
    { kind: "out", text: "→ cd my-app && pnpm dev" },
  ],
  ides: [
    {
      icon: PiCommandBold,
      label: "Claude Code",
      path: ".claude/skills/<slug>/SKILL.md",
    },
    {
      icon: PiCommandBold,
      label: "Cursor",
      path: ".cursor/rules/<slug>.mdc",
    },
    {
      icon: PiCommandBold,
      label: "Windsurf",
      path: ".windsurfrules",
    },
  ],
};

export const LANDING_HOW_IT_WORKS: LandingSection & {
  steps: Array<{ icon: IconType; title: string; body: string }>;
} = {
  eyebrow: "How it works",
  title: "Three steps,",
  titleAccent: "no setup",
  description: "Paste, generate, drop in. That's it.",
  steps: [
    {
      icon: PiLightningBold,
      title: "Paste a URL",
      body: "Any docs site, marketing page, or API reference. We handle the scraping, screenshots, and CSS extraction.",
    },
    {
      icon: PiMagicWandBold,
      title: "We structure it",
      body: "Each page gets distilled into the right shape — design tokens, API patterns, library guides — with examples.",
    },
    {
      icon: PiCompassBold,
      title: "Drop into your agent",
      body: "Copy as Claude Code skill, Cursor rule, or plain markdown. Frontmatter, sections, and examples included.",
    },
  ],
};

export const LANDING_FINAL_CTA = {
  eyebrow: "Ready to start",
  title: "Paste a URL.",
  titleAccent: "Get a skill.",
  description:
    "No signup needed to try. Cached results never count against your quota.",
} as const;
