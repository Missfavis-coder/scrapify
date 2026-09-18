
"use client";

import { Playfair_Display } from "next/font/google";
import { useMemo } from "react";
import {
  Zap,
  RotateCcw,
  Eye,
  Database,
} from "lucide-react";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

export interface BenefitItem {
  label: string;
  value: string;
}

export interface BenefitReceiptCardProps {
  icon?: React.ElementType;
  titleLines?: [string, string];
  items?: BenefitItem[];
  totalLabel?: string;
  totalValue?: string;
  footerNote?: string;
  validText?: string;
  className?: string;
}

const DEFAULT_ITEMS: BenefitItem[] = [
  { label: "Browser navigation", value: "Automated" },
  { label: "Repetitive clicks", value: "Handled" },
  { label: "Data collection", value: "Extracted" },
  { label: "Manual research", value: "Reduced" },
];

function buildZigzagClipPath(
  teeth: number,
  depthPct: number
): string {
  const top: string[] = [];

  for (let i = 0; i <= teeth; i++) {
    const x = (i / teeth) * 100;
    const y = i % 2 === 0 ? 0 : depthPct;

    top.push(`${x}% ${y}%`);
  }

  const bottom: string[] = [];

  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth) * 100;
    const y = i % 2 === 0 ? 100 : 100 - depthPct;

    bottom.push(`${x}% ${y}%`);
  }

  return `polygon(${[...top, ...bottom].join(", ")})`;
}

const BARCODE_WIDTHS = [
  2, 1, 1, 3, 1, 2, 1, 4, 1, 1, 2, 1, 3, 1, 1,
  4, 1, 2, 1, 1, 3, 1, 2, 4, 1, 1, 2, 1, 3, 1,
  1, 2,
];

function Barcode() {
  let x = 0;

  const bars = BARCODE_WIDTHS.map((w, i) => {
    const isGuard = w === 4;

    const bar = (
      <rect
        key={i}
        x={x}
        y={0}
        width={isGuard ? 2 : 1.4}
        height={isGuard ? 44 : 36}
        fill="white"
      />
    );

    x += w * 2.1;

    return bar;
  });

  return (
    <svg
      viewBox={`0 0 ${x} 44`}
      className="h-11 w-full max-w-[220px]"
    >
      {bars}
    </svg>
  );
}

export default function BenefitReceiptCard({
  icon: Icon = Zap,
  titleLines = ["More Time,", "Less Work"],
  items = DEFAULT_ITEMS,
  totalLabel = "Time saved",
  totalValue = "Hours",
  footerNote = "Powered by Scrapify",
  validText = "Works on the web",
  className = "",
}: BenefitReceiptCardProps) {
  const zigzag = useMemo(
    () => buildZigzagClipPath(18, 3.2),
    []
  );

  return (
    <div
      className={`relative w-full pt-6 ${playfair.variable} ${className}`}
    >
      {/* Tape */}
      <div className="absolute -top-1 left-1/2 z-10 -translate-x-1/2 -rotate-3">
        <svg
          width="164"
          height="34"
          viewBox="0 0 164 34"
          className="drop-shadow-sm"
        >
          <rect
            x="0"
            y="0"
            width="164"
            height="34"
            fill="#D9D3C7"
            fillOpacity="0.78"
          />

          <rect
            x="0"
            y="0"
            width="164"
            height="34"
            fill="url(#tapeGrain)"
            opacity="0.15"
          />

          <defs>
            <pattern
              id="tapeGrain"
              width="4"
              height="4"
              patternUnits="userSpaceOnUse"
            >
              <rect
                width="4"
                height="4"
                fill="transparent"
              />

              <circle
                cx="1"
                cy="1"
                r="0.4"
                fill="#000"
              />
            </pattern>
          </defs>
        </svg>
      </div>

      {/* Receipt */}
      <div
        style={{ clipPath: zigzag }}
        className="relative bg-secondary px-8 pb-10 pt-12 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)]"
      >
        {/* Paper fold / center texture */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/5" />

        {/* Icon */}
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-black/5">
          <Icon className="h-5 w-5 text-[#fef29e]" />
        </div>

        {/* Title */}
        <h1
          className="mt-4 text-center text-[1.55rem] font-semibold leading-[1.15] text-[#fef29e]"
          style={{
            fontFamily: "var(--font-playfair)",
          }}
        >
          {titleLines[0]}
          <br />
          {titleLines[1]}
        </h1>

        {/* Items */}
        <ul className="mt-7 space-y-2.5">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-baseline justify-between gap-4 text-[11px] font-medium uppercase tracking-[0.04em] text-white"
            >
              <span>{item.label}</span>

              <span className="text-right tabular-nums text-[#fef29e]">
                {item.value}
              </span>
            </li>
          ))}
        </ul>

        {/* Total */}
        <div className="mt-6 flex items-baseline justify-between border-t border-black/10 pt-4">
          <span className="text-lg font-bold uppercase tracking-wide text-white">
            {totalLabel}
          </span>

          <span className="text-lg font-bold tabular-nums text-white">
            {totalValue}
          </span>
        </div>

        <div className="my-6 border-t border-dashed border-black/25" />

        {/* Footer */}
        <div className="flex flex-col items-center gap-3">
          <p
            className="text-[13px] font-semibold uppercase tracking-[0.03em] text-white"
            style={{
              fontFamily: "var(--font-playfair)",
            }}
          >
            {footerNote}
          </p>

          <Barcode />

          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
            style={{
              fontFamily: "var(--font-playfair)",
            }}
          >
            {validText}
          </p>
        </div>
      </div>
    </div>
  );
}

