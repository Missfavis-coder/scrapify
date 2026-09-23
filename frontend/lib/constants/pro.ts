import type { IconType } from "react-icons";
import {
  PiInfinityBold,
  PiSparkleFill,
  PiMagicWandBold,
  PiCommandBold,
  PiPaletteBold,
  PiPlugsConnectedBold,
  PiUsersThreeBold,
  PiCalendarCheckBold,
  PiPackageBold,
  PiStackBold,
  PiKeyBold,
  PiGithubLogoBold,
  PiFigmaLogoBold,
} from "react-icons/pi";
import { BILLING } from "@/lib/constants/billing";

export interface ProFeature {
  icon: IconType;
  title: string;
  description: string;
  comingSoon?: boolean;
}

export const PRO_FEATURES: ProFeature[] = [
  {
    icon: PiInfinityBold,
    title: "Unlimited inspiration imports",
    description:
      "Pull palettes, type, and vibe from Dribbble, Pinterest, Figma, or any image you upload — no monthly cap.",
  },
  {
    icon: PiStackBold,
    title: "Multi-source merge",
    description:
      "Blend two to five inspirations into a single synthesized skill in your private dashboard.",
  },
  {
    icon: PiMagicWandBold,
    title: "AI iteration prompts",
    description:
      "Run prompts on any skill you own or bookmark — make it more conservative, dark-first, fintech-flavored, anything.",
  },
  {
    icon: PiPaletteBold,
    title: "All four modes unlocked",
    description:
      "Use design, api, library, and generic generation modes — not just design.",
  },
  {
    icon: PiCommandBold,
    title: "CLI superpowers",
    description:
      "Custom templates, watch mode, and unlimited inits across every project on your machine.",
  },
  {
    icon: PiPackageBold,
    title: "Multi-framework templates",
    description: "Next, Vite, Astro, and Remix scaffolds with the same token contract.",
    comingSoon: true,
  },
  {
    icon: PiFigmaLogoBold,
    title: "Figma plugin",
    description: "Turn any skill bundle into a styles library inside Figma in one click.",
    comingSoon: true,
  },
  {
    icon: PiGithubLogoBold,
    title: "GitHub Action",
    description:
      "Watch a source URL — when it changes, a PR opens with the new tokens applied to your repo.",
    comingSoon: true,
  },
  {
    icon: PiKeyBold,
    title: "Unlimited API keys & MCP calls",
    description:
      `Free includes 1 API key and ${BILLING.freeMcpCallsPerDay} MCP calls per day. Pro unlocks unlimited keys and unlimited MCP traffic.`,
  },
  {
    icon: PiUsersThreeBold,
    title: "Members-only community",
    description:
      "Curated Discord with #show-and-tell, #help, weekly prompts, and member spotlights.",
  },
  {
    icon: PiCalendarCheckBold,
    title: "Weekly office hours",
    description:
      "Forty-five minutes, founder-led, every week. Recorded for the archive if you can't make it.",
  },
  {
    icon: PiPlugsConnectedBold,
    title: "Tekcify family bundle",
    description:
      "One day, one Tekcify subscription unlocks Pro on binx, pdfx, and whatever ships next.",
    comingSoon: true,
  },
];

export const PRO_FEATURE_LIST_PRIMARY: string[] = [
  "Unlimited inspiration imports (Dribbble, Pinterest, Figma, image upload)",
  "Multi-source merge — blend up to 5 inspirations",
  "AI iteration on any skill you own or bookmark",
  "All four modes — design, api, library, generic",
  "CLI custom templates + watch mode + unlimited inits",
  "Multi-framework templates (next + vite + astro + remix)",
  "Figma plugin, GitHub Action",
  "Unlimited API keys + unlimited MCP calls",
];

export const FREE_FEATURE_LIST: string[] = [
  "Browse the public registry, unlimited",
  "Generate from any public URL, unlimited",
  "Bookmarks + project history",
  `${BILLING.freeInitsPerMonth} inspiration imports / month`,
  "10 CLI inits per month",
  `1 API key + ${BILLING.freeMcpCallsPerDay} MCP calls per day`,
];

export const PRO_PAGE_COPY = {
  eyebrow: "Pricing",
  heroTitleStart: "Pricing, ",
  heroTitleAccent: "simplified",
  heroTitleEnd: ".",
  heroSubtitle:
    "Free stays free. Pro unlocks inspiration imports, AI iteration, every mode, and the full CLI.",
  freeCardName: "Free",
  freeCardPrice: "$0",
  freeCardCadence: "always",
  freeCardDescription:
    "Browse the registry, generate from any public URL, and bookmark what matters.",
  freeCardCta: "Start free",
  proMonthlyName: "Pro Monthly",
  proMonthlyBadge: "Most flexible",
  proMonthlyDescription:
    "Inspiration imports, AI iteration, every mode, full CLI, community access.",
  proMonthlyCadence: "per month",
  proMonthlyCta: "Upgrade to Pro",
  proYearlyName: "Pro Yearly",
  proYearlyBadge: "Save 18%",
  proYearlyDescription:
    "Same as monthly. Two months free. One renewal a year.",
  proYearlyCadence: "per year",
  proYearlyCta: "Get yearly",
  ltdName: "Lifetime",
  ltdBadge: "First 500",
  ltdDescription: "Pay once. Keep Pro forever — every feature we ever ship.",
  ltdCadence: "one-time",
  ltdCta: "Buy lifetime",
  ltdSoldOutLabel: "Lifetime deal sold out",
  ltdSoldOutHelper: "Lifetime deal is sold out — Pro Monthly or Yearly still available.",
  whatsIncludedTitle: "What's in Pro",
  whatsIncludedSubtitle:
    "Single tier. Same features on every plan. Lifetime gets every future Pro feature too.",
  comingSoonLabel: "Coming soon",
  faqTitle: "Common questions",
} as const;

export const PRO_FAQ: { question: string; answer: string }[] = [
  {
    question: "What does Pro unlock that Free doesn't?",
    answer:
      "Inspiration imports beyond 3 a month, multi-source merges, AI iteration on any skill, all four generation modes, CLI custom templates and watch mode, every workflow integration we ship, and the members-only community.",
  },
  {
    question: "Will Pro features become Free later?",
    answer:
      "The public registry and public-URL generation stay free forever. Pro features are funded by Pro subscribers — they stay on Pro.",
  },
  {
    question: "What happens to my Pro skills if I cancel?",
    answer:
      "Public skills stay public — they always do. Private inspiration imports stay readable in the dashboard but lose iteration prompts and merges until you reactivate.",
  },
  {
    question: "Is the Lifetime Deal really lifetime?",
    answer: `Yes. ${BILLING.ltdCap} spots, one payment, every Pro feature we ship — forever. No tiering, no upsells.`,
  },
  {
    question: "Do you offer team plans?",
    answer:
      "Not at $5.99. Two seats are $12 — most teams just buy individuals. We'll revisit when the math changes.",
  },
];

export const UPGRADE_MODAL_COPY = {
  default: {
    eyebrow: "Pro",
    title: "Unlock Pro",
    tagline:
      "Inspiration imports, AI iteration, every mode, full CLI — plus the community.",
  },
  inspiration_quota: {
    eyebrow: "Quota reached",
    title: "You've used your monthly inspirations",
    tagline:
      "Pro gets unlimited Dribbble, Pinterest, Figma, and image imports — plus multi-source merges.",
  },
  ai_iteration: {
    eyebrow: "Pro feature",
    title: "AI iteration is a Pro feature",
    tagline:
      "Run prompts against any skill you own or bookmark — derive new private variants in seconds.",
  },
  private_template: {
    eyebrow: "Pro feature",
    title: "Custom templates are a Pro feature",
    tagline:
      "Point the CLI at your own GitHub repo and let `init` clone from there — with watch mode that re-applies tokens on change.",
  },
  all_modes: {
    eyebrow: "Pro feature",
    title: "Unlock api, library, and generic modes",
    tagline:
      "Free covers design generations. Pro opens the other three modes for any URL.",
  },
  web_generate_quota: {
    eyebrow: "Monthly limit reached",
    title: "You've used your free generations",
    tagline: `Free covers ${BILLING.freeWebGeneratesPerMonth} new skills a month — cached results don't count. Pro removes the cap entirely.`,
  },
  asset_prompt: {
    eyebrow: "Pro feature",
    title: "Reverse-engineer any asset into a prompt",
    tagline:
      "Pro turns a brand's OG image, logo, or screenshot into a detailed, ready-to-paste image-generation prompt — recreate the look in seconds.",
  },
} as const;

export type UpgradeModalReason = keyof typeof UPGRADE_MODAL_COPY;

export const UPGRADE_MODAL_BULLETS: string[] = [
  "Unlimited inspiration imports + multi-source merge",
  "AI iteration prompts on any skill",
  "All four modes — design, api, library, generic",
  "CLI custom templates + watch mode",
  "Members-only Discord + weekly office hours",
];

export const UPGRADE_MODAL_CTAS = {
  monthly: {
    label: `Upgrade — $${BILLING.proMonthlyPriceUsd}/mo`,
    href: "/pricing",
  },
  lifetime: {
    label: `See lifetime — $${BILLING.ltdPriceUsd}`,
    href: "/pricing#ltd",
  },
} as const;

export const ACCOUNT_BILLING_COPY = {
  reactivateTitle: "Reactivate subscription",
  reactivateDescription:
    "Your subscription is set to end at the next billing date. Reactivate any time from the billing portal.",
  reactivateCta: "Reactivate in portal",
  proPerksTitle: "What's in Pro",
  proPerksSubtitle: "Every Pro feature available on your account.",
} as const;
