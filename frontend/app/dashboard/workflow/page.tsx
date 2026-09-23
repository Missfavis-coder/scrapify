"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  Clock3,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type WorkflowStatus = "Active" | "Draft" | "Paused";
type RunStatus = "Successful" | "Failed" | "Never";

type WorkflowResult = {
  value: string;
  label: string;
  type: "value" | "text" | "error";
};

type WorkflowItem = {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: number;
  steps: number;
  lastRun: string;
  lastRunStatus: RunStatus;
  lastResult: WorkflowResult;
  runtime: string;
  updatedAt: string;
};

const initialWorkflows: WorkflowItem[] = [
  {
    id: "wf_8f92a1",
    name: "Jumia Bag Availability",
    description:
      "Get the total number of bags available on Jumia.",
    status: "Active",
    version: 3,
    steps: 5,
    lastRun: "2h ago",
    lastRunStatus: "Successful",
    lastResult: {
      value: "1,284",
      label: "bags available",
      type: "value",
    },
    runtime: "6.8s",
    updatedAt: "Sep 18, 2026",
  },
  {
    id: "wf_31bc72",
    name: "Extract Product Images",
    description:
      "Extract all product images from a product page.",
    status: "Active",
    version: 2,
    steps: 4,
    lastRun: "Yesterday",
    lastRunStatus: "Successful",
    lastResult: {
      value: "42",
      label: "images extracted",
      type: "value",
    },
    runtime: "4.2s",
    updatedAt: "Sep 17, 2026",
  },
  {
    id: "wf_72de91",
    name: "Monitor Competitor Prices",
    description:
      "Check product prices and report changes.",
    status: "Draft",
    version: 1,
    steps: 7,
    lastRun: "Never",
    lastRunStatus: "Never",
    lastResult: {
      value: "—",
      label: "No runs yet",
      type: "text",
    },
    runtime: "—",
    updatedAt: "Sep 17, 2026",
  },
  {
    id: "wf_51aa43",
    name: "Collect Product Information",
    description:
      "Extract product names, prices and availability.",
    status: "Paused",
    version: 4,
    steps: 6,
    lastRun: "3 days ago",
    lastRunStatus: "Successful",
    lastResult: {
      value: "128",
      label: "products collected",
      type: "value",
    },
    runtime: "9.4s",
    updatedAt: "Sep 15, 2026",
  },
  {
    id: "wf_91cd42",
    name: "Check Product Availability",
    description:
      "Check whether a specific product is currently available.",
    status: "Active",
    version: 2,
    steps: 5,
    lastRun: "35 min ago",
    lastRunStatus: "Failed",
    lastResult: {
      value: "Login required",
      label: "Could not complete the task",
      type: "error",
    },
    runtime: "3.1s",
    updatedAt: "Sep 23, 2026",
  },
  {
    id: "wf_43fa12",
    name: "Find Cheapest Laptop",
    description:
      "Find the cheapest available laptop matching the request.",
    status: "Active",
    version: 3,
    steps: 8,
    lastRun: "1h ago",
    lastRunStatus: "Successful",
    lastResult: {
      value: "₦245,000",
      label: "lowest price found",
      type: "value",
    },
    runtime: "11.2s",
    updatedAt: "Sep 22, 2026",
  },
  {
    id: "wf_28ac51",
    name: "Find Available Flights",
    description:
      "Find available flights between two destinations.",
    status: "Active",
    version: 2,
    steps: 9,
    lastRun: "4h ago",
    lastRunStatus: "Successful",
    lastResult: {
      value: "17",
      label: "flights found",
      type: "value",
    },
    runtime: "14.6s",
    updatedAt: "Sep 22, 2026",
  },
  {
    id: "wf_64bd20",
    name: "Check Delivery Status",
    description:
      "Check the latest delivery status for an order.",
    status: "Active",
    version: 1,
    steps: 6,
    lastRun: "5h ago",
    lastRunStatus: "Failed",
    lastResult: {
      value: "Order not found",
      label: "No matching order was located",
      type: "error",
    },
    runtime: "5.7s",
    updatedAt: "Sep 21, 2026",
  },
];

const statusFilters = [
  "All",
  "Active",
  "Draft",
  "Paused",
] as const;

type StatusFilter = (typeof statusFilters)[number];

export default function WorkflowsPage() {
  const router = useRouter();

  const [workflows, setWorkflows] =
    useState<WorkflowItem[]>(initialWorkflows);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const [toast, setToast] =
    useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);

    window.setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const filteredWorkflows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return workflows.filter((workflow) => {
      const matchesSearch =
        !query ||
        workflow.name
          .toLowerCase()
          .includes(query) ||
        workflow.description
          .toLowerCase()
          .includes(query) ||
        workflow.id.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        workflow.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, workflows]);

  const openWorkflow = (workflowId: string) => {
    router.push(`/dashboard/workflows/${workflowId}`);
  };

  const archiveWorkflow = (
    workflow: WorkflowItem,
  ) => {
    setWorkflows((current) =>
      current.filter(
        (item) => item.id !== workflow.id,
      ),
    );

    setOpenMenu(null);

    showToast(
      `"${workflow.name}" moved to archive`,
    );
  };

  const deleteWorkflow = (
    workflow: WorkflowItem,
  ) => {
    const confirmed = window.confirm(
      `Delete "${workflow.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setWorkflows((current) =>
      current.filter(
        (item) => item.id !== workflow.id,
      ),
    );

    setOpenMenu(null);

    showToast("Automation deleted");
  };

  const toggleWorkflowStatus = (
    workflow: WorkflowItem,
  ) => {
    if (workflow.status === "Draft") {
      showToast(
        "This workflow needs to be completed first.",
      );

      setOpenMenu(null);

      return;
    }

    const nextStatus: WorkflowStatus =
      workflow.status === "Active"
        ? "Paused"
        : "Active";

    setWorkflows((current) =>
      current.map((item) =>
        item.id === workflow.id
          ? {
              ...item,
              status: nextStatus,
              updatedAt: "Just now",
            }
          : item,
      ),
    );

    setOpenMenu(null);

    showToast(
      nextStatus === "Active"
        ? `"${workflow.name}" is now active`
        : `"${workflow.name}" is paused`,
    );
  };

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto mt-10 w-full max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#b70569]/10">
                <Workflow className="size-4 text-[#b70569]" />
              </div>

              <span className="text-xs font-medium text-[#b70569]">
                Web Workflows
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
              Automations
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Your saved workflows, runs and results.
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

        {/* Toolbar */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
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

          <div className="flex w-fit items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
            {statusFilters.map((filter) => {
              const active =
                statusFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setStatusFilter(filter)
                  }
                  className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-white text-[#b70569] shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workflow list */}
        <div className="mt-6 overflow-visible rounded-xl border border-neutral-200 bg-white">
          {/* Table heading */}
          <div className="hidden border-b border-neutral-100 bg-neutral-50/70 px-5 py-3 text-xs font-medium text-neutral-400 md:grid md:grid-cols-[minmax(0,1.6fr)_110px_100px_150px_minmax(150px,0.9fr)_44px] md:items-center md:gap-5">
            <span>Workflow</span>
            <span>Status</span>
            <span>Version</span>
            <span>Last run</span>
            <span>Result</span>
            <span />
          </div>

          {filteredWorkflows.length > 0 ? (
            <div className="divide-y divide-neutral-100">
              {filteredWorkflows.map(
                (workflow) => (
                  <WorkflowRow
                    key={workflow.id}
                    workflow={workflow}
                    menuOpen={
                      openMenu === workflow.id
                    }
                    onMenuToggle={() =>
                      setOpenMenu((current) =>
                        current === workflow.id
                          ? null
                          : workflow.id,
                      )
                    }
                    onOpen={() =>
                      openWorkflow(workflow.id)
                    }
                    onArchive={() =>
                      archiveWorkflow(workflow)
                    }
                    onDelete={() =>
                      deleteWorkflow(workflow)
                    }
                    onToggleStatus={() =>
                      toggleWorkflowStatus(
                        workflow,
                      )
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EmptyState
              hasFilters={
                Boolean(search) ||
                statusFilter !== "All"
              }
              onClear={() => {
                setSearch("");
                setStatusFilter("All");
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between px-1 text-xs text-neutral-400">
          <span>
            {filteredWorkflows.length}{" "}
            {filteredWorkflows.length === 1
              ? "workflow"
              : "workflows"}
          </span>

          <span>
            {workflows.length} total
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 shadow-xl">
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

function WorkflowRow({
  workflow,
  menuOpen,
  onMenuToggle,
  onOpen,
  onArchive,
  onDelete,
  onToggleStatus,
}: {
  workflow: WorkflowItem;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onOpen: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div className="group relative px-5 py-5 transition hover:bg-neutral-50/70">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1.6fr)_110px_100px_150px_minmax(150px,0.9fr)_44px] md:items-center md:gap-5">
        {/* Workflow */}
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onOpen}
              className="mt-0.5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 transition hover:border-[#b70569]/20 hover:bg-[#b70569]/5"
              aria-label={`Open ${workflow.name}`}
            >
              <Workflow className="size-4 text-neutral-500" />
            </button>

            <div className="min-w-0">
              <button
                type="button"
                onClick={onOpen}
                className="block max-w-full cursor-pointer truncate text-left text-sm font-medium text-neutral-900 transition hover:text-[#b70569]"
              >
                {workflow.name}
              </button>

              <p className="mt-1 max-w-xl truncate text-sm text-neutral-500">
                {workflow.description}
              </p>

              <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
                <span>
                  {workflow.steps}{" "}
                  {workflow.steps === 1
                    ? "step"
                    : "steps"}
                </span>

                <span className="size-1 rounded-full bg-neutral-300" />

                <span>
                  Updated {workflow.updatedAt}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <button
            type="button"
            onClick={onToggleStatus}
            title={
              workflow.status === "Active"
                ? "Pause workflow"
                : "Activate workflow"
            }
            className="cursor-pointer"
          >
            <WorkflowStatusBadge
              status={workflow.status}
            />
          </button>
        </div>

        {/* Version */}
        <div>
          <span className="inline-flex rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 font-mono text-xs text-neutral-600">
            v{workflow.version}
          </span>
        </div>

        {/* Last run */}
        <div>
          <div className="flex items-center gap-2">
            <RunStatusBadge
              status={workflow.lastRunStatus}
            />

            <span className="text-xs text-neutral-400">
              {workflow.lastRun}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
            <Clock3 className="size-3.5" />
            {workflow.runtime}
          </div>
        </div>

        {/* Result */}
        <div className="min-w-0">
          {workflow.lastRunStatus === "Never" ? (
            <div>
              <p className="text-sm text-neutral-400">
                No runs yet
              </p>

              <p className="mt-1 text-xs text-neutral-400">
                {workflow.lastResult.label}
              </p>
            </div>
          ) : workflow.lastRunStatus ===
            "Failed" ? (
            <div>
              <p className="truncate text-sm font-medium text-red-600">
                {workflow.lastResult.value}
              </p>

              <p className="mt-1 truncate text-xs text-neutral-500">
                {workflow.lastResult.label}
              </p>
            </div>
          ) : (
            <div>
              <p className="truncate text-sm font-medium text-neutral-900">
                {workflow.lastResult.value}
              </p>

              <p className="mt-1 truncate text-xs text-neutral-500">
                {workflow.lastResult.label}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
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
            <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 shadow-xl">
              <MenuItem
                icon={
                  workflow.status === "Active"
                    ? Pause
                    : Play
                }
                label={
                  workflow.status === "Active"
                    ? "Pause"
                    : "Activate"
                }
                onClick={onToggleStatus}
              />

              <div className="my-1 border-t border-neutral-100" />

              <MenuItem
                icon={Archive}
                label="Archive"
                onClick={onArchive}
              />

              <MenuItem
                icon={Trash2}
                label="Delete"
                destructive
                onClick={onDelete}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowStatusBadge({
  status,
}: {
  status: WorkflowStatus;
}) {
  const styles: Record<
    WorkflowStatus,
    string
  > = {
    Active:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    Draft:
      "border-neutral-200 bg-neutral-50 text-neutral-500",
    Paused:
      "border-amber-200 bg-amber-50 text-amber-700",
  };

  const dotStyles: Record<
    WorkflowStatus,
    string
  > = {
    Active: "bg-emerald-500",
    Draft: "bg-neutral-400",
    Paused: "bg-amber-500",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span
        className={`size-1.5 rounded-full ${dotStyles[status]}`}
      />

      {status}

      <ChevronDown className="size-3" />
    </span>
  );
}

function RunStatusBadge({
  status,
}: {
  status: RunStatus;
}) {
  const config: Record<
    RunStatus,
    {
      label: string;
      text: string;
      dot: string;
    }
  > = {
    Successful: {
      label: "Successful",
      text: "text-emerald-600",
      dot: "bg-emerald-500",
    },
    Failed: {
      label: "Failed",
      text: "text-red-500",
      dot: "bg-red-500",
    },
    Never: {
      label: "Not run",
      text: "text-neutral-400",
      dot: "bg-neutral-300",
    },
  };

  const current = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${current.text}`}
    >
      <span
        className={`size-1.5 rounded-full ${current.dot}`}
      />

      {current.label}
    </span>
  );
}

function MenuItem({
  icon: Icon,
  label,
  destructive = false,
  onClick,
}: {
  icon: typeof Archive;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition ${
        destructive
          ? "text-red-500 hover:bg-red-50"
          : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <Search className="size-5 text-neutral-400" />
      </div>

      <h3 className="mt-4 text-sm font-medium text-neutral-900">
        No workflows found
      </h3>

      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        {hasFilters
          ? "Try changing your search or status filter."
          : "Create your first workflow to get started."}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 cursor-pointer text-xs font-medium text-[#b70569] hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function PauseIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect
        x="5"
        y="4"
        width="4"
        height="16"
        rx="1"
      />
      <rect
        x="15"
        y="4"
        width="4"
        height="16"
        rx="1"
      />
    </svg>
  );
}

function PlayIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}