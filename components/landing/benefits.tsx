
"use client";

import { motion } from "framer-motion";
import {
  Zap,
  RotateCcw,
  Eye,
  Database,
} from "lucide-react";

const benefits = [
  {
    icon: Zap,
    titleLines: ["Less Work,", "More Output"],
    items: [
      { label: "Repetitive tasks", value: "Automated" },
      { label: "Browser actions", value: "Handled" },
      { label: "Manual research", value: "Reduced" },
      { label: "Time wasted", value: "Minimized" },
    ],
    totalLabel: "Time saved",
    totalValue: "Hours",
    footerNote: "Powered by Scrapify",
    validText: "Works on the web",
  },
  {
    icon: RotateCcw,
    titleLines: ["Build Once,", "Run Again"],
    items: [
      { label: "Workflow", value: "Saved" },
      { label: "Steps", value: "Reusable" },
      { label: "Setup", value: "Once" },
      { label: "Future runs", value: "1-click" },
    ],
    totalLabel: "Reusable",
    totalValue: "100%",
    footerNote: "Automation that sticks",
    validText: "Run it again",
  },
  {
    icon: Eye,
    titleLines: ["Know What,", "Actually Happened"],
    items: [
      { label: "Browser activity", value: "Visible" },
      { label: "Screenshots", value: "Captured" },
      { label: "Actions", value: "Tracked" },
      { label: "Results", value: "Verified" },
    ],
    totalLabel: "Visibility",
    totalValue: "Full",
    footerNote: "No black box",
    validText: "Every step matters",
  },
  {
    icon: Database,
    titleLines: ["Messy Web,", "Clean Data"],
    items: [
      { label: "Web pages", value: "Parsed" },
      { label: "Information", value: "Extracted" },
      { label: "Results", value: "Structured" },
      { label: "Exports", value: "Ready" },
    ],
    totalLabel: "Output",
    totalValue: "Clean",
    footerNote: "From web to data",
    validText: "Ready to use",
  },
];

const BARCODE_WIDTHS = [
  2, 1, 1, 3, 1, 2, 1, 4, 1, 1, 2, 1, 3, 1, 1,
  4, 1, 2, 1, 1, 3, 1, 2, 4, 1, 1, 2, 1, 3, 1,
  1, 2,
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

export default function Benefits() {
  const zigzag = buildZigzagClipPath(18, 3.2);

  return (
    <section className=" py-20 bg-primary mt-28">
      <div className="mx-auto max-w-7xl overflow-hidden  px-6 py-16 md:px-10 lg:px-14">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            Why Scrapify
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Work smarter, not harder.
          </h2>

          <p className="mt-4 text-[15px] leading-7 text-white/70">
            Scrapify takes the repetitive work off your hands and turns
            everyday browser tasks into reusable automation.
          </p>
        </motion.div>

        {/* Receipt Cards */}
        <div className="mt-14 grid md:gap-4 gap-10 lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-2 ">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;

            return (
              <motion.div
                key={benefit.titleLines.join("-")}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.1,
                }}
                viewport={{ once: true }}
                className="relative pt-6"
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
                  className="relative bg-pink-500 px-8 pb-10 pt-12 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.35)]"
                >
                  {/* Subtle center line */}
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/5" />

                  {/* Icon */}
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10">
                    <Icon className="h-5 w-5 text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="mt-4 text-center text-[16px] font-semibold leading-[1.15] text-white">
                    {benefit.titleLines[0]}
                    <br />
                    {benefit.titleLines[1]}
                  </h3>

                  {/* Items */}
                  <ul className="mt-7 space-y-2.5">
                    {benefit.items.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-baseline justify-between gap-4 text-[11px] font-medium uppercase tracking-[0.04em] text-white"
                      >
                        <span>{item.label}</span>

                        <span className="text-right tabular-nums text-white/80">
                          {item.value}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Total */}
                  <div className="mt-6 flex items-baseline justify-between border-t border-white/20 pt-4">
                    <span className="text-lg font-bold uppercase tracking-wide text-white">
                      {benefit.totalLabel}
                    </span>

                    <span className="text-lg font-bold tabular-nums text-white">
                      {benefit.totalValue}
                    </span>
                  </div>

                  <div className="my-6 border-t border-dashed border-white/25" />

                  {/* Footer */}
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.03em] text-white">
                      {benefit.footerNote}
                    </p>

                    <Barcode />

                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/80">
                      {benefit.validText}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

