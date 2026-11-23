"use client";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import { PiGlobeBold } from "react-icons/pi";

import type { ModeSelectorHandle } from "@/components/home/mode-selector";


import { URL_PLACEHOLDERS } from "@/lib/constants/url-placeholders";

import type { GenerationMode } from "@/lib/types/generation";
import { MODES } from "@/lib/constants/modes";

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;

  mode: GenerationMode;
  setMode: React.Dispatch<
    React.SetStateAction<GenerationMode>
  >;

  detectionReason: string | null;
  setDetectionReason: React.Dispatch<
    React.SetStateAction<string | null>
  >;

  overriddenRef: React.MutableRefObject<boolean>;
  modeRef: React.MutableRefObject<ModeSelectorHandle | null>;

  placeholderIndex: number;
  isPending: boolean;

  onManualModeChange: (
    mode: GenerationMode
  ) => void;

  onChangeClick: () => void;

  showDetection: boolean;
  showModeSelector: boolean;
}

export default function UrlInput({
  value,
  onChange,
  inputRef,
  mode,
  placeholderIndex,
  isPending,
  onChangeClick,
  showDetection,
  detectionReason,
}: UrlInputProps) {
  const detectedLabel =
    MODES.find((m) => m.id === mode)?.label ?? mode;

  return (
    <>
      <div className="animated-shine-border animated-shine-border-reverse group relative flex h-14 w-full items-center gap-2 rounded-full border border-neutral-200 bg-transparent pl-4 pr-1.5">
        <PiGlobeBold className="size-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" />

        <div className="relative flex h-full min-w-0 flex-1 items-center">
          <input
            ref={inputRef}
            id="automation-url"
            type="text"
            inputMode="url"
            placeholder=""
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isPending}
            value={value}
            onChange={(event) =>
              onChange(event.target.value)
            }
            className="h-full w-full bg-transparent text-base text-neutral-800 focus:outline-none disabled:opacity-60"
          />

          {value.length === 0 && !isPending ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden"
            >
              <AnimatePresence
                mode="wait"
                initial={false}
              >
                <motion.span
                  key={placeholderIndex}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: -10,
                  }}
                  transition={{
                    duration: 0.35,
                    ease: "easeOut",
                  }}
                  className="block max-w-full truncate text-sm text-muted-foreground sm:text-base"
                >
                  {
                    URL_PLACEHOLDERS[
                      placeholderIndex
                    ]
                  }
                </motion.span>
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>

      {showDetection ? (
        <p className="mt-3 text-center text-xs text-neutral-500">
          Auto-detected:{" "}
          <span className="text-secondary">
            {detectedLabel}
          </span>

          <span aria-hidden>
            {" "}
            &middot;{" "}
          </span>

          {detectionReason}

          <button
            type="button"
            onClick={onChangeClick}
            className="ml-2 text-primary underline-offset-2 hover:underline"
          >
            Change
          </button>
        </p>
      ) : null}
    </>
  );
}