import type { GenerationMode } from "@/lib/types/generation";

interface SampleChip {
  label: string;
  url: string;
  mode: GenerationMode;
}

export const SAMPLE_CHIPS: ReadonlyArray<SampleChip> = [
  { label: "stripe.com", url: "https://stripe.com", mode: "design" },
  { label: "linear.app", url: "https://linear.app", mode: "design" },
  { label: "vercel.com", url: "https://vercel.com", mode: "design" },
  { label: "paystack.com/docs", url: "https://paystack.com/docs", mode: "api" },
  { label: "tanstack.com/query", url: "https://tanstack.com/query", mode: "library" },
];
