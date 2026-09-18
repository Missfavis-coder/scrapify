import type { DesignUpdateSource } from "@/lib/types/design-updates";

export const DESIGN_UPDATES = {
  endpoint: "/api/design-updates",
  idLength: 14,
  emailMax: 254,
  ratePerHour: 5,
  defaultSource: "footer" satisfies DesignUpdateSource,
  validSources: ["footer", "modal", "discover"] as const satisfies readonly DesignUpdateSource[],
  copy: {
    eyebrow: "Stay in the loop",
    title: "Get notified when new designs drop",
    description:
      "Hand-picked design systems turned into agent-ready skill files. One email when something fresh lands — no marketing fluff.",
    placeholder: "you@studio.com",
    submitLabel: "Notify me",
    submittingLabel: "Subscribing…",
    successHeading: "You're in.",
    successDescription:
      "We'll ping you the moment we ship a new design drop.",
    alreadySubscribed: "You're already on the list — see you soon.",
    invalidEmail: "Enter a valid email address.",
    rateLimited: "Too many attempts. Try again in a few minutes.",
    genericError: "Could not subscribe right now. Please try again.",
  },
} as const;
