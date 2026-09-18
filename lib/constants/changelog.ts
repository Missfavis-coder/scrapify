import type { ChangelogEntry } from "@/lib/types/changelog";

export const CHANGELOG: ReadonlyArray<ChangelogEntry> = [
  {
    version: "1.0",
    date: "2026-06-06",
    title: "Enhanced skill generation",
    changes: [
      { kind: "added", text: "Multi-page context — crawled pages feed directly into skill body generation for richer product and docs-site skills." },
      { kind: "added", text: "Suggested packages section recommends install commands tuned to each generation mode." },
      { kind: "added", text: "Redesigned result view with palette strip, type ramp, and live style preview from extracted tokens." },
      { kind: "added", text: "Copy-ready agent prompt for wiring the skill into MCP-compatible editors." },
      { kind: "improved", text: "Design-mode pipeline weighs sitemap and nav links together so the most relevant pages surface first." },
    ],
  },
  {
    version: "0.9",
    date: "2026-06-04",
    title: "Deep asset collection",
    changes: [
      { kind: "added", text: "Extracts favicon, logo, OG image, Twitter card image, and up to 24 on-page images from every source URL." },
      { kind: "added", text: "Captures above-the-fold and full-page screenshots alongside extracted brand assets." },
      { kind: "added", text: "Assets tab — preview, download individually, or export everything as a zip." },
      { kind: "added", text: "AI-generated asset prompts for reusing brand visuals in agent workflows." },
    ],
  },
  {
    version: "0.8",
    date: "2026-06-02",
    title: "Sitemap discovery",
    changes: [
      { kind: "added", text: "Generation crawler reads `robots.txt` and `sitemap.xml` to discover pages beyond the homepage nav." },
      { kind: "added", text: "Pages tab on design results lists every URL crawled during generation with title and link-out." },
      { kind: "added", text: "Dynamic `sitemap.xml` indexes public skills, host directories, and curated GitHub skills for search engines." },
    ],
  },
  {
    version: "0.7",
    date: "2026-06-01",
    title: "skillmd CLI",
    changes: [
      { kind: "added", text: "`npx skillmd` brings generation straight into your terminal — pipe any URL to a local `skill.md` without leaving the editor." },
      { kind: "added", text: "Project linking syncs generated skills to your account so the same file is available across machines." },
      { kind: "added", text: "Template library — `skillmd init` scaffolds Claude Code, Cursor, and Windsurf configs preloaded with your skills." },
      { kind: "improved", text: "Streaming output mirrors the web app so you watch sections write in real time." },
    ],
  },
  {
    version: "0.6",
    date: "2026-05-30",
    title: "Figma Connect",
    changes: [
      { kind: "added", text: "Connect a Figma file and pull real component names, variants, and variables into a design skill." },
      { kind: "added", text: "Figma plugin publishes selected frames as skill context, including auto-layout and token references." },
      { kind: "added", text: "Skills now embed Figma node IDs so agents can round-trip back to the source design." },
      { kind: "improved", text: "Design token extraction prefers Figma variables over scraped CSS when both are available." },
    ],
  },
  {
    version: "0.5",
    date: "2026-05-28",
    title: "Inspiration sources and bookmarks",
    changes: [
      { kind: "added", text: "Pull inspiration from Dribbble, Figma Community, and Pinterest and turn any board into a skill." },
      { kind: "added", text: "Bookmark skills from Discover — saved items live in your dashboard for one-click reuse." },
      { kind: "added", text: "Inspiration boards surface visually similar references next to every generated skill." },
      { kind: "improved", text: "Discover ranks bookmarked and remixed skills higher so the best community work stays visible." },
    ],
  },
] as const;
