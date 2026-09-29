
"use client";

import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  Globe,
  History,
  MoreHorizontal,
  MousePointer2,
  Pause,
  Play,
  ScanSearch,
  Search,
  SlidersHorizontal,
  Terminal,
  Type,
} from "lucide-react";
import Link from "next/link";

interface WorkflowResultProps {
  automationId: string;
}

type WorkflowAction =
  | "navigate"
  | "search"
  | "filter"
  | "extract"
  | "click"
  | "type"
  | "wait";

interface WorkflowStep {
  action: WorkflowAction;
  selector?: string;
  url?: string;
  value?: string;
  field?: string;
  fields?: string[];
  description?: string;
}

interface WorkflowGraph {
  steps: WorkflowStep[];
  parameters: string[];
}

interface Workflow {
  id: string;
  name: string;
  targetUrl: string;
  taskDescription: string;
  createdAt: string;
  lastRun: string;
  lastRunStatus: "successful" | "failed" | "never";
  status: "active" | "paused";
  workflowGraph: WorkflowGraph;
}

const workflow: Workflow = {
  id: "52oh6p",
  name: "Jumia Bag Availability",
  targetUrl: "https://www.jumia.com.ng",
  taskDescription:
    "Get the total number of bags available on Jumia.",
  createdAt: "Sep 23, 2026",
  lastRun: "2 hours ago",
  lastRunStatus: "successful",
  status: "active",
  workflowGraph: {
    steps: [
      {
        action: "navigate",
        url: "https://www.jumia.com.ng",
        description: "Open Jumia",
      },
      {
        action: "search",
        value: "{{query}}",
        description: "Search for bags",
      },
      {
        action: "click",
        description: "Open the bags category",
      },
      {
        action: "filter",
        field: "availability",
        description: "Show products that are currently available",
      },
      {
        action: "extract",
        fields: ["name", "price", "availability"],
        description: "Collect the available bag information",
      },
    ],
    parameters: ["query"],
  },
};

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function formatParameterName(parameter: string) {
  return parameter
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

function getActionLabel(action: WorkflowAction) {
  switch (action) {
    case "navigate":
      return "Open website";
    case "search":
      return "Search";
    case "filter":
      return "Filter results";
    case "extract":
      return "Collect information";
    case "click":
      return "Click";
    case "type":
      return "Enter information";
    case "wait":
      return "Wait";
    default:
      return action;
  }
}

function ActionIcon({ action }: { action: WorkflowAction }) {
  const className = "h-4 w-4";

  switch (action) {
    case "navigate":
      return <Globe className={className} />;
    case "search":
      return <Search className={className} />;
    case "filter":
      return <SlidersHorizontal className={className} />;
    case "extract":
      return <ScanSearch className={className} />;
    case "click":
      return <MousePointer2 className={className} />;
    case "type":
      return <Type className={className} />;
    case "wait":
      return <Clock3 className={className} />;
    default:
      return <Terminal className={className} />;
  }
}

function StepDetails({ step }: { step: WorkflowStep }) {
  if (step.action === "navigate" && step.url) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
        <Globe className="h-3.5 w-3.5 shrink-0 text-neutral-400" />

        <span className="truncate font-mono text-xs text-neutral-500">
          {step.url}
        </span>
      </div>
    );
  }

  if (
    (step.action === "search" || step.action === "type") &&
    step.value
  ) {
    return (
      <div className="mt-3 rounded-lg bg-neutral-50 px-3 py-2">
        <span className="font-mono text-xs text-neutral-600">
          {step.value}
        </span>
      </div>
    );
  }

  if (step.action === "filter" && step.field) {
    return (
      <div className="mt-3">
        <span className="inline-flex rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
          {step.field}
        </span>
      </div>
    );
  }

  if (step.action === "extract" && step.fields) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {step.fields.map((field) => (
          <span
            key={field}
            className="rounded-md bg-[#b70569]/[0.06] px-2.5 py-1 text-xs text-[#b70569]"
          >
            {field}
          </span>
        ))}
      </div>
    );
  }

  return null;
}

export function WorkflowResult({
  automationId,
}: WorkflowResultProps) {
  void automationId;

  const handleRun = () => {
    console.log("Run automation:", workflow.id);
  };

  return (
    <main className="mt-14 min-h-screen bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8">

        {/* TOP BAR */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard/automations"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            All automations
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3.5 py-2.5 md:text-sm font-medium text-neutral-600 hover:bg-neutral-50 cursor-pointer text-xs"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>

            <button
              type="button"
              onClick={handleRun}
              className="inline-flex items-center gap-2 rounded-lg bg-[#b70569] px-4 py-2.5 md:text-sm font-medium text-white hover:bg-[#9d045b] cursor-pointer text-xs"
            >
              <Play className="h-4 w-4 fill-current" />
              Run now
            </button>

            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 cursor-pointer text-xs"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* HEADER */}
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">

            <span className="text-xs text-neutral-400">
              Created {workflow.createdAt}
            </span>
          </div>

          <h1 className="md:text-2xl text-xl font-semibold tracking-tight text-neutral-950">
            {workflow.name}
          </h1>

          <p className=" max-w-3xl text-sm leading-6 text-neutral-500">
            {workflow.taskDescription}
          </p>

          <div className="">
            <p className="text-xs text-neutral-400">
              Website
            </p>

            <a
              href={workflow.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-neutral-800 hover:text-[#b70569]"
            >
              <span className="truncate">
                {getHostname(workflow.targetUrl)}
              </span>

              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </div>
        </section>

        {/* CONTENT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">

          {/* LEFT */}
          <div className="space-y-6">

            {/* WORKFLOW */}
            <section className="rounded-2xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-6 py-5">
                <h2 className="font-medium text-neutral-900">
                  How it works
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  The steps Scrapify follows when this automation runs.
                </p>
              </div>

              <div className="p-6">
                {workflow.workflowGraph.steps.map(
                  (step, index) => {
                    const isLast =
                      index ===
                      workflow.workflowGraph.steps.length - 1;

                    return (
                      <div
                        key={`${step.action}-${index}`}
                        className="relative flex gap-4"
                      >
                        {!isLast && (
                          <div className="absolute left-[17px] top-10 bottom-0 w-px bg-neutral-200" />
                        )}

                        <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500">
                          <ActionIcon action={step.action} />
                        </div>

                        <div
                          className={`min-w-0 flex-1 ${
                            isLast ? "pb-1" : "pb-8"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-neutral-900">
                                {getActionLabel(step.action)}
                              </p>

                              {step.description && (
                                <p className="mt-1 text-sm leading-6 text-neutral-500">
                                  {step.description}
                                </p>
                              )}
                            </div>

                            <span className="shrink-0 text-xs text-neutral-400">
                              Step {index + 1}
                            </span>
                          </div>

                          <StepDetails step={step} />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            {/* EXPECTED RESULT */}
            <section className="rounded-2xl border border-neutral-200 bg-white md:hidden block">
              <div className="border-b border-neutral-100 px-6 py-5">
                <h2 className="font-medium text-neutral-900">
                  Expected result
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Information this automation collects.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-3">
                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-400">
                    Product
                  </p>

                  <p className="mt-2 text-sm font-medium text-neutral-800">
                    Bag name
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-400">
                    Price
                  </p>

                  <p className="mt-2 text-sm font-medium text-neutral-800">
                    Product price
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-400">
                    Availability
                  </p>

                  <p className="mt-2 text-sm font-medium text-neutral-800">
                    Available status
                  </p>
                </div>
              </div>
            </section>

            {/* RUN CTA */}
            <section className="rounded-2xl border border-[#b70569]/15 bg-[#b70569]/[0.035]">
              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-medium text-neutral-950">
                    Ready to run it?
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Scrapify will follow the workflow and return
                    the information it finds.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRun}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#b70569] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#9d045b]"
                >
                  Run automation
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <aside className="space-y-6">

                        {/* EXPECTED RESULT */}
                        <section className="rounded-2xl md:block hidden border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-6 py-5">
                <h2 className="font-medium text-neutral-900">
                  Expected result
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Information this automation collects.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 p-6 ">
                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-400">
                    Product
                  </p>

                  <p className="mt-2 text-sm font-medium text-neutral-800">
                    Bag name
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-400">
                    Price
                  </p>

                  <p className="mt-2 text-sm font-medium text-neutral-800">
                    Product price
                  </p>
                </div>

                <div className="rounded-xl border border-neutral-200 p-4">
                  <p className="text-xs text-neutral-400">
                    Availability
                  </p>

                  <p className="mt-2 text-sm font-medium text-neutral-800">
                    Available status
                  </p>
                </div>
              </div>
            </section>

            {/* LATEST RUN */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="font-medium text-neutral-900">
                    Latest run
                  </h2>

                  <p className="mt-1 text-sm text-neutral-500">
                    Most recent execution.
                  </p>
                </div>

                <History className="h-4 w-4 text-neutral-400" />
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />

                  <span className="text-sm font-medium text-emerald-800">
                    Completed successfully
                  </span>
                </div>

                <p className="mt-2 text-sm text-emerald-700">
                  The automation completed without any issues.
                </p>

                <p className="mt-3 text-xs text-emerald-600">
                  {workflow.lastRun}
                </p>
              </div>

              <Link
                href={`/automations/${workflow.id}/runs`}
                className="mt-4 flex items-center justify-between text-sm font-medium text-neutral-600 hover:text-[#b70569]"
              >
                View run history
                <ChevronRight className="h-4 w-4" />
              </Link>
            </section>


            {/* SCHEDULE */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                  <CalendarClock className="h-4 w-4 text-neutral-500" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-neutral-900">
                    Schedule
                  </h2>

                  <p className="mt-1 text-sm leading-5 text-neutral-500">
                    This automation currently runs manually.
                  </p>

                  <button
                    type="button"
                    className="mt-3 text-sm font-medium text-[#b70569] hover:underline"
                  >
                    Add a schedule
                  </button>
                </div>
              </div>
            </section>

            {/* WEBSITE */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                  <Globe className="h-4 w-4 text-neutral-500" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-neutral-400">
                    Website
                  </p>

                  <a
                    href={workflow.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block truncate text-sm font-medium text-neutral-800 hover:text-[#b70569]"
                  >
                    {getHostname(workflow.targetUrl)}
                  </a>

                  <p className="mt-1 truncate text-xs text-neutral-400">
                    {workflow.targetUrl}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* FOOTER */}
        <div className="mt-8 flex items-center gap-3 border-t border-neutral-100 pt-6">
          <Link
            href="/automations"
            className="text-sm font-medium text-neutral-600 hover:text-[#b70569]"
          >
            All automations
          </Link>

          <ChevronRight className="h-4 w-4 text-neutral-300" />

          <span className="truncate text-sm text-neutral-400">
            {workflow.name}
          </span>
        </div>
      </div>
    </main>
  );
}

