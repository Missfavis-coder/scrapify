import type { GenerationMode } from "@/lib/types/generation";

export interface SamplePickDetail {
  url: string;
  mode: GenerationMode;
}

export const SAMPLE_PICK_EVENT = "getskillmd:sample-pick";

export function dispatchSamplePick(detail: SamplePickDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAMPLE_PICK_EVENT, { detail }));
}
