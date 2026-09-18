"use client";

import { useRouter } from "nextjs-toploader/app";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import debounce from "lodash.debounce"
import { PiArrowRight, PiGlobeBold, PiSpinnerGap } from "react-icons/pi";
import { Button } from "../ui/button";
import {
  ModeSelector,
  type ModeSelectorHandle,
} from "../home/mode-selector";
import { ApiError } from "@/lib/api";
import { useGenerate } from "@/lib/hooks/use-generate";
import { isValidUrl } from "@/lib/utils/url";
import { detectModeFromUrl } from "@/lib/utils/detect-mode";
import { SAMPLE_PICK_EVENT, type SamplePickDetail } from "@/lib/utils/sample-pick";
import { DEFAULT_MODE, MODES } from "@/lib/constants/modes";
import {
  URL_PLACEHOLDERS,
  URL_PLACEHOLDER_INTERVAL_MS,
} from "@/lib/constants/url-placeholders";
import type { GenerationMode } from "@/lib/types/generation";

const FormSchema = z.object({
  url: z.string().min(4).refine(isValidUrl, "Enter a valid URL"),
});

type FormValues = z.infer<typeof FormSchema>;

const DETECT_DEBOUNCE_MS = 250;

export function UrlInput() {
  const router = useRouter();

  const [mode, setMode] = useState<GenerationMode>(DEFAULT_MODE);
  const [detectionReason, setDetectionReason] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const overriddenRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const modeRef = useRef<ModeSelectorHandle>(null);

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { url: "" },
  });

  const urlValue = watch("url");

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const isInputEmpty = urlValue.length === 0;

  useEffect(() => {
    if (!isInputEmpty) return;

    const id = window.setInterval(() => {
      setPlaceholderIndex(
        (i) => (i + 1) % URL_PLACEHOLDERS.length
      );
    }, URL_PLACEHOLDER_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [isInputEmpty]);

  const generate = useGenerate({
    onSuccess: ({ id, cached }) => {
      setIsNavigating(true);

      const params = new URLSearchParams({ mode });

      if (cached) {
        params.set("cached", "1");
      }

      router.push(`/g/${id}?${params.toString()}`);
    },

    onError: (error) => {
      const message =
        error instanceof ApiError
          ? error.message
          : "Something went wrong";

      toast.error(message);
    },
  });

  const onSubmit = handleSubmit(
    (values) => {
      generate.mutate({
        url: values.url,
        mode,
      });
    },
    (errors) => {
      if (errors.url?.message) {
        toast.error(errors.url.message);
      }
    }
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
    debouncedDetect(urlValue);
  }, [urlValue, debouncedDetect]);

  useEffect(() => {
    return () => debouncedDetect.cancel();
  }, [debouncedDetect]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<SamplePickDetail>).detail;

      if (!detail) return;

      setValue("url", detail.url, {
        shouldDirty: true,
        shouldValidate: false,
      });

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
  }, [setValue]);

  const isPending = generate.isPending || isNavigating;

  const detectedLabel =
    MODES.find((m) => m.id === mode)?.label ?? mode;

  const hasValidUrl = isValidUrl(urlValue);

  const showDetection =
    !overriddenRef.current && detectionReason !== null;

  const showModeSelector =
    hasValidUrl &&
    (detectionReason !== null || overriddenRef.current);

  const { ref: registerRef, ...registerRest } = register("url");

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="animated-shine-border animated-shine-border-reverse group relative flex h-14 w-full items-center gap-2 rounded-full border border-border/60 bg-card/90 pl-4 pr-1.5">
        <PiGlobeBold className="size-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" />

        <div className="relative flex h-full min-w-0 flex-1 items-center">
          <input
            type="text"
            inputMode="url"
            placeholder=""
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={isPending}
            {...registerRest}
            ref={(el) => {
              registerRef(el);
              inputRef.current = el;
            }}
            className="h-full w-full bg-transparent text-base text-foreground focus:outline-none disabled:opacity-60"
          />

          {isInputEmpty && !isPending ? (
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.35,
                    ease: "easeOut",
                  }}
                  className="block max-w-full truncate sm:text-base text-sm text-muted-foreground/70"
                >
                  {URL_PLACEHOLDERS[placeholderIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="h-11 gap-1.5 rounded-full px-5 ring-glow sm:text-sm text-xs"
        >
          {isPending ? (
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
          <span className="text-foreground/80">
            {detectedLabel}
          </span>

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