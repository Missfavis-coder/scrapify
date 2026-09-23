import { IconType } from "react-icons";
import { PiArchiveBold, PiBookmarkBold, PiFileArchive } from "react-icons/pi";

export const DASHBOARD_LIMITS = {
  defaultPageSize: 20,
  maxPageSize: 50,
} as const;

export const BOOKMARK_ID_LENGTH = 21;
export const CLI_PROJECT_ID_LENGTH = 21;

export const CLI_PROJECT_REPORT_TIMEOUT_MS = 5_000;

export const DASHBOARD_TABS = {
  bookmarks: "bookmarks",
  projects: "projects",
  generations: "generations",
  inspirations: "inspirations",
  archived: "archived",
} as const;

export type DashboardTabId =
  (typeof DASHBOARD_TABS)[keyof typeof DASHBOARD_TABS];

export const DASHBOARD_COPY = {
  welcomePrefix: "Welcome back,",
  signOutLabel: "Sign out",
  bookmarks: {
    title: "Bookmarks",
    triggerLabel: "Bookmarks",
    empty: {
      heading: "No bookmarks yet",
      description:
        "Save skills you want to revisit. They'll show up here for quick access.",
      ctaLabel: "Browse the registry",
      ctaHref: "/",
    },
  },
  projects: {
    title: "Projects",
    triggerLabel: "Projects",
    empty: {
      heading: "No CLI projects yet",
      description:
        "Run skillmd login, then skillmd init. Projects only appear here when the CLI is signed in.",
      ctaLabel: "View the registry",
      ctaHref: "/",
    },
  },
  generations: {
    title: "Recent generations",
    triggerLabel: "Recent generations",
    empty: {
      heading: "No generations yet",
      description: "Paste a URL on the homepage to generate your first skill.",
      ctaLabel: "Generate one now",
      ctaHref: "/",
    },
  },
  archived: {
    title: "Archived",
    triggerLabel: "Archived",
    empty: {
      heading: "No archived skills",
      description:
        "Archive a skill from its menu to tuck it away here without deleting it.",
      ctaLabel: "View generations",
      ctaHref: "/dashboard",
    },
  },
} as const;


export const DASHBOARD_STATS:  {
  steps: Array<{ icon: IconType; title: string; body: string }>;
} = {
  steps: [
    {
      icon: PiBookmarkBold,
      title: "Bookmarked",
      body: "5",
    },
    {
      icon: PiArchiveBold,
      title: "Archived",
      body: "2",
    },
    {
      icon: PiFileArchive,
      title: "All Projects",
      body: "12",
    },
  ],
};