
"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";


type WorkflowAction =
  | "navigate"
  | "search"
  | "filter"
  | "extract"
  | "click"
  | "type"
  | "wait";

type WorkflowStep = {
  action: WorkflowAction;
  selector?: string;
  url?: string;
  value?: string;
  field?: string;
  fields?: string[];
  description?: string;
};

type WorkflowGraph = {
  steps: WorkflowStep[];
  parameters: string[];
};

type WorkflowItem = {
  id: string;
  name: string;
  targetUrl: string;
  taskDescription: string;
  workflowGraph: WorkflowGraph;
  createdAt: string;
};

/**
 * Temporary frontend data.
 *
 * Replace this with the response from:
 * GET /workflows
 */
const initialWorkflows: WorkflowItem[] = [
  {
    id: "wf_8f92a1",
    name: "Jumia Bag Availability",
    targetUrl: "https://www.jumia.com.ng",
    taskDescription:
      "Get the total number of bags available on Jumia.",
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
          description: "Filter available products",
        },
        {
          action: "extract",
          fields: ["name", "price", "availability"],
          description: "Extract available bags",
        },
      ],
      parameters: ["query"],
    },
    createdAt: "Sep 23, 2026",
  },
  {
    id: "wf_31bc72",
    name: "Extract Product Images",
    targetUrl: "https://example-store.com",
    taskDescription:
      "Extract all product images from a product page.",
    workflowGraph: {
      steps: [
        {
          action: "navigate",
          url: "https://example-store.com",
          description: "Open product page",
        },
        {
          action: "click",
          description: "Open product gallery",
        },
        {
          action: "wait",
          description: "Wait for gallery images to load",
        },
        {
          action: "extract",
          fields: ["images"],
          description: "Extract product images",
        },
      ],
      parameters: [],
    },
    createdAt: "Sep 22, 2026",
  },
  {
    id: "wf_72de91",
    name: "Monitor Competitor Prices",
    targetUrl: "https://competitor-store.com",
    taskDescription:
      "Check product prices and report changes.",
    workflowGraph: {
      steps: [
        {
          action: "navigate",
          url: "https://competitor-store.com",
          description: "Open competitor store",
        },
        {
          action: "search",
          value: "{{product}}",
          description: "Find the requested product",
        },
        {
          action: "click",
          description: "Open the product",
        },
        {
          action: "extract",
          fields: ["name", "price"],
          description: "Extract current price",
        },
      ],
      parameters: ["product"],
    },
    createdAt: "Sep 21, 2026",
  },
  {
    id: "wf_51aa43",
    name: "Collect Product Information",
    targetUrl: "https://store.example.com",
    taskDescription:
      "Extract product names, prices and availability.",
    workflowGraph: {
      steps: [
        {
          action: "navigate",
          url: "https://store.example.com",
          description: "Open product listing",
        },
        {
          action: "search",
          value: "{{query}}",
          description: "Search for products",
        },
        {
          action: "filter",
          field: "category",
          description: "Apply product category",
        },
        {
          action: "click",
          description: "Open matching products",
        },
        {
          action: "extract",
          fields: ["name", "price", "availability"],
          description: "Extract product information",
        },
      ],
      parameters: ["query"],
    },
    createdAt: "Sep 20, 2026",
  },
];

const actionLabels: Record<WorkflowAction, string> = {
  navigate: "Navigate",
  search: "Search",
  filter: "Filter",
  extract: "Extract",
  click: "Click",
  type: "Type",
  wait: "Wait",
};

export default function WorkflowsPage() {
  const router = useRouter();

  const [workflows, setWorkflows] =
    useState<WorkflowItem[]>(initialWorkflows);

  const [search, setSearch] = useState("");

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const filteredWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return workflows;
    }

    return workflows.filter((workflow) => {
      return (
        workflow.name.toLowerCase().includes(query) ||
        workflow.targetUrl.toLowerCase().includes(query) ||
        workflow.taskDescription
          .toLowerCase()
          .includes(query)
      );
    });
  }, [search, workflows]);

  const openWorkflow = (id: string) => {
    router.push(`/dashboard/workflows/${id}`);
  };

  const deleteWorkflow = (workflow: WorkflowItem) => {
    const confirmed = window.confirm(
      `Delete "${workflow.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setWorkflows((current) =>
      current.filter((item) => item.id !== workflow.id),
    );

    setOpenMenu(null);
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto mt-10 w-full max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>

            <h1 className="mt-3 md:text-2xl text-xl font-semibold tracking-tight text-neutral-950">
              Your automations
            </h1>

            <p className="mt-1 max-w-xl text-sm leading-6 text-neutral-700">
              Workflows Scrapify has discovered and saved for
              you.
            </p>
          </div>

          <Button
            type="button"
            onClick={() =>
              router.push("/dashboard/home")
            }
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#b70569] px-4 text-sm font-medium text-white transition hover:bg-[#a1045e]"
          >
            <Plus className="size-4" />
            Create automation
          </Button>
        </div>

        {/* Search / filters */}
        <div className="mt-8 flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search automations..."
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-9 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#b70569]/30 focus:ring-2 focus:ring-[#b70569]/10"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <SlidersHorizontal className="size-3.5" />
            {filteredWorkflows.length}{" "}
            {filteredWorkflows.length === 1
              ? "automation"
              : "automations"}
          </div>
        </div>

        {/* Automation list */}
        {filteredWorkflows.length > 0 ? (
          <div className="divide-y divide-neutral-200">
            {filteredWorkflows.map((workflow) => (
              <AutomationRow
                key={workflow.id}
                workflow={workflow}
                menuOpen={openMenu === workflow.id}
                onOpen={() =>
                  openWorkflow(workflow.id)
                }
                onMenuToggle={() =>
                  setOpenMenu((current) =>
                    current === workflow.id
                      ? null
                      : workflow.id,
                  )
                }
                onDelete={() =>
                  deleteWorkflow(workflow)
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            hasSearch={Boolean(search)}
            onClear={() => setSearch("")}
            onCreate={() =>
              router.push("/dashboard/home")
            }
          />
        )}

        {/* Footer */}
        {filteredWorkflows.length > 0 && (
          <div className="mt-4 flex items-center justify-between px-1 text-xs text-neutral-400">
            <span>
              Showing {filteredWorkflows.length} of{" "}
              {workflows.length}
            </span>

            <span>
              {workflows.length === 1
                ? "1 saved automation"
                : `${workflows.length} saved automations`}
            </span>
          </div>
        )}
      </div>
    </main>
  );
}

function AutomationRow({
  workflow,
  menuOpen,
  onOpen,
  onMenuToggle,
  onDelete,
}: {
  workflow: WorkflowItem;
  menuOpen: boolean;
  onOpen: () => void;
  onMenuToggle: () => void;
  onDelete: () => void;
}) {
  const stepCount = workflow.workflowGraph.steps.length;

  const parameterCount =
    workflow.workflowGraph.parameters.length;

  return (
    <div className="group relative py-5 transition hover:bg-neutral-50/60">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_110px_110px_40px] md:items-center md:gap-6">
        {/* Main information */}
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 cursor-pointer text-left"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 transition group-hover:border-[#b70569]/20 group-hover:bg-[#b70569]/5">
              <Workflow className="size-4 text-neutral-500 transition group-hover:text-[#b70569]" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-medium text-neutral-900 transition group-hover:text-[#b70569]">
                  {workflow.name}
                </h2>

                <ArrowUpRight className="size-3.5 shrink-0 text-neutral-300 transition group-hover:text-[#b70569]" />
              </div>

              <p className="mt-1 max-w-2xl truncate text-sm text-neutral-500">
                {workflow.taskDescription}
              </p>

              <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-neutral-400">
                <span className="truncate">
                  {getHostname(workflow.targetUrl)}
                </span>

                <span className="size-1 shrink-0 rounded-full bg-neutral-300" />

                <span className="shrink-0">
                  Created {workflow.createdAt}
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Workflow state */}
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-500" />

          <span className="text-xs font-medium text-neutral-600">
            Ready
          </span>
        </div>

        {/* Steps */}
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {stepCount}
          </p>

          <p className="mt-0.5 text-xs text-neutral-400">
            {stepCount === 1 ? "step" : "steps"}
          </p>
        </div>

        {/* Parameters */}
        <div>
          <p className="text-sm font-medium text-neutral-900">
            {parameterCount}
          </p>

          <p className="mt-0.5 text-xs text-neutral-400">
            {parameterCount === 1
              ? "parameter"
              : "parameters"}
          </p>
        </div>

        {/* Menu */}
        <div className="relative flex justify-end">
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label={`Actions for ${workflow.name}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 md:opacity-0 md:group-hover:opacity-100"
          >
            <MoreHorizontal className="size-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
              <button
                type="button"
                onClick={onOpen}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
              >
                <ChevronRight className="size-3.5" />
                Open automation
              </button>

              <div className="my-1 border-t border-neutral-100" />

              <button
                type="button"
                onClick={onDelete}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-red-500 transition hover:bg-red-50"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  hasSearch,
  onClear,
  onCreate,
}: {
  hasSearch: boolean;
  onClear: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <Workflow className="size-5 text-neutral-400" />
      </div>

      <h2 className="mt-4 text-sm font-medium text-neutral-900">
        {hasSearch
          ? "No automations found"
          : "No automations yet"}
      </h2>

      <p className="mt-1 max-w-sm text-sm leading-6 text-neutral-500">
        {hasSearch
          ? "Try a different search term."
          : "Create an automation and Scrapify will discover the workflow for you."}
      </p>

      {hasSearch ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 cursor-pointer text-xs font-medium text-[#b70569] hover:underline"
        >
          Clear search
        </button>
      ) : (
        <Button
          type="button"
          onClick={onCreate}
          className="mt-5 h-9 cursor-pointer rounded-lg bg-[#b70569] px-3.5 text-xs font-medium text-white hover:bg-[#a1045e]"
        >
          <Plus className="mr-1.5 size-3.5" />
          Create automation
        </Button>
      )}
    </div>
  );
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

