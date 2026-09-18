"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe,
  Loader2,
  XCircle,
  Terminal,
} from "lucide-react";
import Link from "next/link";

interface WorkflowResultProps {
  automationId: string;
}

const steps = [
  {
    id: 1,
    title: "Open website",
    description: "Navigate to the target website",
    status: "completed",
    duration: "1.2s",
  },
  {
    id: 2,
    title: "Find the requested information",
    description: "Locate the relevant content on the page",
    status: "completed",
    duration: "2.8s",
  },
  {
    id: 3,
    title: "Extract the result",
    description: "Read and process the requested information",
    status: "completed",
    duration: "1.4s",
  },
  {
    id: 4,
    title: "Return the result",
    description: "Prepare the final response",
    status: "completed",
    duration: "0.8s",
  },
];

export function WorkflowResult({
  automationId,
}: WorkflowResultProps) {
  return (
    <div className="mt-14 min-h-screen bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/automations"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to automations
          </Link>
        </div>

        {/* Automation heading */}
        <section className="mb-8">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-neutral-950">
            Find the total number of bags available
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Scrapify completed the task and extracted the requested
            information from the website.
          </p>
        </section>

        {/* URL + status */}
        <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
              <Globe className="h-3.5 w-3.5" />
              Website
            </div>

            <a
              href="https://jumia.com"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 text-sm font-medium text-neutral-800 transition hover:text-[#b70569]"
            >
              jumia.com
              <ExternalLink className="h-3.5 w-3.5 text-neutral-400 transition group-hover:text-[#b70569]" />
            </a>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>

            <div>
              <p className="text-sm font-medium text-neutral-900">
                Completed
              </p>
              <p className="text-xs text-neutral-400">
                Finished just now
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Workflow */}
          <section className="rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-neutral-900">
                    Workflow
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    What Scrapify did to complete the task
                  </p>
                </div>

                <span className="text-xs text-neutral-400">
                  4 steps
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-0">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="relative flex gap-4"
                  >
                    {/* Connecting line */}
                    {index !== steps.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-neutral-200" />
                    )}

                    {/* Step icon */}
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50">
                      {step.status === "completed" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : step.status === "running" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#b70569]" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pb-7">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {step.title}
                          </p>

                          <p className="mt-1 text-sm text-neutral-500">
                            {step.description}
                          </p>
                        </div>

                        <span className="shrink-0 text-xs text-neutral-400">
                          {step.duration}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Result */}
          <section className="rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-6 py-5">
              <div>
                <h2 className="font-medium text-neutral-900">
                  Result
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  What the automation found
                </p>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-xl border border-[#b70569]/10 bg-[#b70569]/[0.04] p-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#b70569]">
                  Extracted result
                </p>

                <div className="text-4xl font-semibold tracking-tight text-neutral-950">
                  128
                </div>

                <p className="mt-2 text-sm text-neutral-500">
                  bags available
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <span className="text-sm text-neutral-500">
                    Execution time
                  </span>

                  <span className="text-sm font-medium text-neutral-800">
                    6.2 seconds
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <span className="text-sm text-neutral-500">
                    Pages visited
                  </span>

                  <span className="text-sm font-medium text-neutral-800">
                    3
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500">
                    Status
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Successful
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Evidence */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-6 py-5">
            <div>
              <h2 className="font-medium text-neutral-900">
                Evidence
              </h2>

              <p className="mt-1 text-sm text-neutral-500">
                A snapshot of where Scrapify got the result
              </p>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.6fr]">
            {/* Screenshot placeholder */}
            <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                  <Globe className="h-5 w-5 text-neutral-400" />
                </div>

                <p className="text-sm font-medium text-neutral-700">
                  Website screenshot
                </p>

                <p className="mt-1 text-xs text-neutral-400">
                  Screenshot captured during execution
                </p>
              </div>
            </div>

            {/* Execution info */}
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-wider text-neutral-400">
                Execution details
              </p>

              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs text-neutral-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    Started
                  </div>

                  <p className="text-sm text-neutral-800">
                    Just now
                  </p>
                </div>

                <div>
                  <div className="mb-1 flex items-center gap-2 text-xs text-neutral-400">
                    <Terminal className="h-3.5 w-3.5" />
                    Actor
                  </div>

                  <p className="text-sm text-neutral-800">
                    Scrapify Agent
                  </p>
                </div>

                <div>
                  <div className="mb-1 text-xs text-neutral-400">
                    Run
                  </div>

                  <p className="break-all font-mono text-xs text-neutral-500">
                    {automationId}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}