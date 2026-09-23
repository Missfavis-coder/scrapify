import type { GenerationMode } from "@/lib/types/generation";

interface ModeMeta {
  id: GenerationMode;
  label: string;
  description: string;
  example: string;
  proOnly: boolean;
}

export const MODES: ReadonlyArray<ModeMeta> = [
  {
    id: "design",
    label: "Design system",
    description: "Marketing or product sites — extracts colors, typography, components",
    example: "stripe.com",
    proOnly: false,
  },
  {
    id: "motion",
    label: "Motion / WebGL",
    description:
      "Animation-heavy & WebGL sites — captures scroll motion, video/media assets, and the animation stack",
    example: "lusion.co",
    proOnly: true,
  },
  {
    id: "api",
    label: "API docs",
    description: "API reference docs — extracts endpoints, auth, request shapes",
    example: "paystack.com/docs",
    proOnly: true,
  },
  {
    id: "library",
    label: "Library / SDK",
    description: "npm packages, framework docs — extracts install, core API, patterns",
    example: "tanstack.com/query",
    proOnly: true,
  },
  {
    id: "generic",
    label: "Other",
    description: "Anything else — extracts headings, key concepts, code samples",
    example: "any documentation URL",
    proOnly: true,
  },
] as const;

export const DEFAULT_MODE: GenerationMode = "design";

export const MODE_IDS = MODES.map((mode) => mode.id) as [
  GenerationMode,
  ...GenerationMode[],
];

export const PRO_ONLY_MODES: ReadonlyArray<GenerationMode> = MODES.filter(
  (mode) => mode.proOnly
).map((mode) => mode.id);

export function isProOnlyMode(mode: GenerationMode): boolean {
  return PRO_ONLY_MODES.includes(mode);
}

export const MODE_GATE_COPY = {
  proLockTooltip: "Pro feature — sign in and upgrade to use this mode.",
  proLockShort: "Pro",
  serverGateMessage:
    "Free covers design generations. Upgrade to Pro to use motion, api, library, and generic modes.",
} as const;
