"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { PiLockSimpleBold } from "react-icons/pi";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { GenerationMode } from "@/lib/types/generation";
import { cn } from "@/lib/utils";
import { MODE_GATE_COPY, MODES } from "@/lib/constants/modes";

interface ModeSelectorProps {
  value: GenerationMode;
  onChange: (mode: GenerationMode) => void;
  isPro?: boolean;
}

export interface ModeSelectorHandle {
  focus: () => void;
}

export const ModeSelector = forwardRef<ModeSelectorHandle, ModeSelectorProps>(
  function ModeSelector({ value, onChange, isPro = false }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        const active = containerRef.current?.querySelector<HTMLButtonElement>(
          "button[data-active='true']"
        );
        active?.focus();
      },
    }));

    return (
      <TooltipProvider >
        <div
          ref={containerRef}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {MODES.map((mode) => {
            const isActive = mode.id === value;
            const showLock = mode.proOnly && !isPro;
            const button = (
              <button
                key={mode.id}
                type="button"
                data-active={isActive}
                onClick={() => onChange(mode.id)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary/50 bg-linear-to-b from-primary/20 to-primary/10 text-primary"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <span>{mode.label}</span>
                {showLock ? (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary/80">
                    <PiLockSimpleBold className="size-3" />
                    {MODE_GATE_COPY.proLockShort}
                  </span>
                ) : null}
              </button>
            );

            if (!showLock) return button;
            return (
              <Tooltip key={mode.id}>
                <TooltipTrigger >{button}</TooltipTrigger>
                <TooltipContent side="top">
                  {MODE_GATE_COPY.proLockTooltip}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }
);
