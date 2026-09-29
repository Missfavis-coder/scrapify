"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

const loadingSteps = [
  {
    id: 1,
    title: "Open website",
    description: "Navigate to the target website",
  },
  {
    id: 2,
    title: "Find the requested information",
    description: "Locate the relevant content on the page",
  },
  {
    id: 3,
    title: "Extract the result",
    description: "Read and process the requested information",
  },
  {
    id: 4,
    title: "Return the result",
    description: "Prepare the final response",
  },
];

export function WorkflowSkeleton() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= loadingSteps.length - 1) return;

    const timer = setTimeout(() => {
      setActiveStep((step) => step + 1);
    }, 1400);

    return () => clearTimeout(timer);
  }, [activeStep]);

  return (
    <div className="mt-14 min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
        </div>

        {/* Automation heading */}
        <section className="mb-8">
          <div className="h-9 w-2/3 max-w-3xl animate-pulse rounded bg-neutral-200" />

          <div className="mt-4 h-4 w-1/2 max-w-2xl animate-pulse rounded bg-neutral-100" />

          <div className="mt-2 h-4 w-2/5 max-w-2xl animate-pulse rounded bg-neutral-100" />
        </section>

        {/* URL + status */}
        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto]">
          {/* Website */}
          <div className="rounded-xl border border-black/5 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-neutral-300" />

              <div className="h-3 w-14 animate-pulse rounded bg-neutral-200" />
            </div>

            <div className="h-4 w-28 animate-pulse rounded bg-neutral-200" />
          </div>

          {/* Status */}
          <div className="flex items-center gap-3 rounded-xl border border-black/5 bg-white px-5 py-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-neutral-200" />

            <div className="space-y-2">
              <div className="h-3.5 w-20 animate-pulse rounded bg-neutral-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Workflow */}
          <section className="rounded-2xl border border-black/5 bg-white">
            {/* Workflow header */}
            <div className="border-b border-black/5 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />

                  <div className="mt-2 h-3.5 w-64 animate-pulse rounded bg-neutral-100" />
                </div>

                <div className="h-3 w-12 animate-pulse rounded bg-neutral-100" />
              </div>
            </div>

{/* Workflow steps */}
<div className="p-6">
  <div className="space-y-0">
    {loadingSteps.map((step, index) => {
      const isDone = index < activeStep;
      const isActive = index === activeStep;

      return (
        <div
          key={step.id}
          className="relative flex gap-4"
        >
          {/* Connecting line */}
          {index !== loadingSteps.length - 1 && (
            <div
              className={`absolute left-[15px] top-8 h-[calc(100%-8px)] w-px transition-colors duration-500 ${
                isDone ? "bg-[#fef29e]" : "bg-neutral-200"
              }`}
            />
          )}

          {/* Step icon */}
          <div
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${
              isDone
                ? "border-[#fef29e] bg-[#fef29e]/10"
                : isActive
                  ? "border-[#b70569]/40 bg-[#b70569]/10 shadow-[0_0_0_4px_rgba(183,5,105,0.06)]"
                  : "border-neutral-200 bg-neutral-100"
            }`}
          >
            {isDone ? (
              <span className="h-3 w-3 rounded-full bg-[#fef29e]" />
            ) : isActive ? (
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute h-3 w-3 animate-ping rounded-full bg-[#b70569]/30" />
                <span className="relative h-2 w-2 rounded-full bg-[#b70569]" />
              </span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            )}
          </div>

{/* Step content */}
<div className="flex-1 pb-7">
  {isDone ? (
    /* Completed step */
    <div className="flex items-start justify-between mt-2">
      <div>
        <p className="text-sm font-medium text-neutral-900">
          {step.title}
        </p>

      </div>

      <span className="shrink-0 text-xs text-neutral-400">
        {index === 0
          ? "1.2s"
          : index === 1
            ? "2.8s"
            : index === 2
              ? "1.4s"
              : "0.8s"}
      </span>
    </div>
  ) : (
    /* Loading / pending step */
    <div className="flex items-start justify-between ">
      <div className="space-y-2">
        {/* Title skeleton */}
        <div
          className={`h-3.5 rounded transition-all duration-500 ${
            isActive
              ? "w-40 bg-neutral-400 animate-pulse"
              : "w-36 bg-neutral-100"
          }`}
        />

</div>
      {/* Duration skeleton */}
      <div
        className={`h-3 w-8 rounded transition-colors duration-500 ${
          isActive
            ? "animate-pulse bg-neutral-200"
            : "bg-neutral-100"
        }`}
      />
    </div>
  )}
</div>
        </div>
      );
    })}
  </div>
</div>
          </section>

          {/* Result */}
          <section className="rounded-2xl border border-black/5 bg-white">
            {/* Result header */}
            <div className="border-b border-black/5 px-6 py-5">
              <div>
                <div className="h-4 w-14 animate-pulse rounded bg-neutral-200" />

                <div className="mt-2 h-3.5 w-44 animate-pulse rounded bg-neutral-100" />
              </div>
            </div>

            <div className="p-6">
              {/* Extracted result */}
              <div className="rounded-xl border border-[#b70569]/10 bg-[#b70569]/5 p-6">
                <div className="mb-3 h-3 w-28 animate-pulse rounded bg-[#b70569]/10" />

                <div className="h-10 w-20 animate-pulse rounded bg-neutral-200" />

                <div className="mt-3 h-3.5 w-28 animate-pulse rounded bg-neutral-100" />
              </div>

              {/* Result metadata */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between border-b border-black/5 pb-3">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3.5 w-20 animate-pulse rounded bg-neutral-200" />
                </div>

                <div className="flex items-center justify-between border-b border-black/5 pb-3">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3.5 w-8 animate-pulse rounded bg-neutral-200" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-14 animate-pulse rounded bg-neutral-100" />

                  <div className="h-3.5 w-20 animate-pulse rounded bg-neutral-200" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Evidence */}
        <section className="mt-6 rounded-2xl border border-black/5 bg-white">
          {/* Evidence header */}
          <div className="border-b border-black/5 px-6 py-5">
            <div>
              <div className="h-4 w-20 animate-pulse rounded bg-neutral-200" />

              <div className="mt-2 h-3.5 w-64 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.6fr]">
            {/* Screenshot */}
            <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50">
              <div className="w-full max-w-md px-8">
                <div className="space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-neutral-200" />

                  <div className="h-8 w-2/3 animate-pulse rounded bg-neutral-200" />

                  <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
                </div>

                <div className="mt-8 space-y-3">
                  <div className="h-3 w-full animate-pulse rounded bg-neutral-100" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-100" />
                </div>
              </div>
            </div>

            {/* Execution info */}
            <div>
              <div className="mb-5 h-3 w-28 animate-pulse rounded bg-neutral-100" />

              <div className="space-y-6">
                <div>
                  <div className="mb-2 h-3 w-16 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3.5 w-20 animate-pulse rounded bg-neutral-200" />
                </div>

                <div>
                  <div className="mb-2 h-3 w-16 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3.5 w-28 animate-pulse rounded bg-neutral-200" />
                </div>

                <div>
                  <div className="mb-2 h-3 w-8 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3.5 w-full animate-pulse rounded bg-neutral-200" />
                  <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded bg-neutral-100" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}