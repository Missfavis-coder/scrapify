
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import debounce from "lodash.debounce";
import { PiArrowRight, PiGlobeBold, PiSpinnerGap } from "react-icons/pi";
import { Button } from "../ui/button";
import {
  ModeSelector,
  type ModeSelectorHandle,
} from "../home/mode-selector";
import { isValidUrl } from "@/lib/utils/url";
import { detectModeFromUrl } from "@/lib/utils/detect-mode";
import {
  SAMPLE_PICK_EVENT,
  type SamplePickDetail,
} from "@/lib/utils/sample-pick";
import {
  URL_PLACEHOLDERS,
  URL_PLACEHOLDER_INTERVAL_MS,
} from "@/lib/constants/url-placeholders";
import type { GenerationMode } from "@/lib/types/generation";
import { DEFAULT_MODE, MODES } from "@/lib/constants/modes";

const DETECT_DEBOUNCE_MS = 250;

export function UrlInput() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<GenerationMode>(DEFAULT_MODE);
  const [detectionReason, setDetectionReason] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const overriddenRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const modeRef = useRef<ModeSelectorHandle>(null);

  const isInputEmpty = url.length === 0;

  useEffect(() => {
    if (!isInputEmpty) return;

    const id = window.setInterval(() => {
      setPlaceholderIndex(
        (index) => (index + 1) % URL_PLACEHOLDERS.length
      );
    }, URL_PLACEHOLDER_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [isInputEmpty]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedUrl = url.trim();

      if (!trimmedUrl) {
        toast.error("Enter a URL");
        inputRef.current?.focus();
        return;
      }

      if (!isValidUrl(trimmedUrl)) {
        toast.error("Enter a valid URL");
        inputRef.current?.focus();
        return;
      }

      setIsNavigating(true);

      const params = new URLSearchParams({
        url: trimmedUrl,
        mode,
      });

      router.push(`/dashboard/automations?${params.toString()}`);
    },
    [mode, router, url]
  );

  const handleManualModeChange = useCallback(
    (next: GenerationMode) => {
      overriddenRef.current = true;
      setMode(next);
    },
    []
  );

  const handleChangeClick = useCallback(() => {
    overriddenRef.current = true;
    modeRef.current?.focus();
  }, []);

  const debouncedDetect = useMemo(
    () =>
      debounce((value: string) => {
        if (overriddenRef.current) return;

        if (!isValidUrl(value)) {
          setDetectionReason(null);
          return;
        }

        const detection = detectModeFromUrl(value);

        setMode(detection.mode);
        setDetectionReason(detection.reason);
      }, DETECT_DEBOUNCE_MS),
    []
  );

  useEffect(() => {
    debouncedDetect(url);
  }, [url, debouncedDetect]);

  useEffect(() => {
    return () => {
      debouncedDetect.cancel();
    };
  }, [debouncedDetect]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SamplePickDetail>).detail;

      if (!detail) return;

      setUrl(detail.url);

      overriddenRef.current = true;
      setMode(detail.mode);
      setDetectionReason(null);

      const el = inputRef.current;

      if (el) {
        el.focus();
        el.setSelectionRange(detail.url.length, detail.url.length);
      }
    };

    window.addEventListener(SAMPLE_PICK_EVENT, handler);

    return () => {
      window.removeEventListener(SAMPLE_PICK_EVENT, handler);
    };
  }, []);

  const detectedLabel =
    MODES.find((item) => item.id === mode)?.label ?? mode;

  const hasValidUrl = isValidUrl(url);

  const showDetection =
    !overriddenRef.current && detectionReason !== null;

  const showModeSelector =
    hasValidUrl &&
    (detectionReason !== null || overriddenRef.current);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="animated-shine-border animated-shine-border-reverse group relative flex h-14 w-full items-center gap-2 rounded-full border border-border/60 bg-card/90 pl-4 pr-1.5">
        <PiGlobeBold className="size-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" />

        <div className="relative flex h-full min-w-0 flex-1 items-center">
          <input
            ref={inputRef}
            type="text"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);

              if (overriddenRef.current) {
                overriddenRef.current = false;
                setDetectionReason(null);
              }
            }}
            placeholder=""
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isNavigating}
            className="h-full w-full bg-transparent text-base text-foreground focus:outline-none disabled:opacity-60"
          />

          {isInputEmpty && !isNavigating ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={placeholderIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.35,
                    ease: "easeOut",
                  }}
                  className="block max-w-full truncate text-sm text-muted-foreground/70 sm:text-base"
                >
                  {URL_PLACEHOLDERS[placeholderIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isNavigating}
          className="h-11 gap-1.5 rounded-full px-5 ring-glow sm:text-sm text-xs"
        >
          {isNavigating ? (
            <>
              <PiSpinnerGap className="size-4 animate-spin" />
              Generating
            </>
          ) : (
            <>
              Generate
              <PiArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>

      {showDetection ? (
        <p className="text-center text-xs text-muted-foreground">
          Auto-detected:{" "}
          <span className="text-foreground/80">{detectedLabel}</span>

          <span aria-hidden> &middot; </span>

          {detectionReason}

          <button
            type="button"
            onClick={handleChangeClick}
            className="ml-2 text-primary underline-offset-2 hover:underline"
          >
            Change
          </button>
        </p>
      ) : null}

      {showModeSelector ? (
        <ModeSelector
          ref={modeRef}
          value={mode}
          onChange={handleManualModeChange}
        />
      ) : null}
    </form>
  );
}