"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  Globe,
  History,
  LoaderCircle,
  MoreHorizontal,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { useAutomation } from "@/lib/hooks/use-automation";
import {
  automationService,
  type AutomationArtifact,
  type AutomationRun,
  type RunStatus,
} from "@/lib/services/automation.service";
import { getHostname } from "@/lib/utils";

interface AutomationResultProps {
  publicId: string;
}

const ACTIVE_STATUSES: RunStatus[] = ["queued", "running"];

function isActiveRun(run: AutomationRun) {
  return ACTIVE_STATUSES.includes(run.status);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function formatArtifactContent(content: unknown): string {
  if (typeof content === "string") {
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }

  if (content == null) {
    return "No result content was saved for this artifact.";
  }

  return JSON.stringify(content, null, 2) ?? String(content);
}

function statusStyles(status: RunStatus) {
  switch (status) {
    case "completed":
      return "border-green-200 bg-green-50 text-green-700";
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";
    case "cancelled":
      return "border-neutral-200 bg-neutral-100 text-neutral-600";
    case "running":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export function AutomationResult({ publicId }: AutomationResultProps) {
  const {
    data: automation,
    isPending,
    isError,
    error,
    refetch,
  } = useAutomation(publicId);

  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [isLoadingRuns, setIsLoadingRuns] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [artifactsByRun, setArtifactsByRun] = useState<
    Record<string, AutomationArtifact[]>
  >({});
  const [artifactErrors, setArtifactErrors] = useState<
    Record<string, string>
  >({});
  const [loadingArtifacts, setLoadingArtifacts] = useState<
    Record<string, boolean>
  >({});

  const requestedArtifacts = useRef(new Set<string>());

  const loadArtifacts = useCallback(async (runId: string) => {
    if (requestedArtifacts.current.has(runId)) return;

    requestedArtifacts.current.add(runId);

    setLoadingArtifacts((current) => ({
      ...current,
      [runId]: true,
    }));

    try {
      const artifacts = await automationService.getArtifacts(runId);

      setArtifactsByRun((current) => ({
        ...current,
        [runId]: artifacts,
      }));

      setArtifactErrors((current) => {
        const next = { ...current };
        delete next[runId];
        return next;
      });
    } catch (error) {
      requestedArtifacts.current.delete(runId);

      setArtifactErrors((current) => ({
        ...current,
        [runId]:
          error instanceof Error
            ? error.message
            : "Unable to load this generated result.",
      }));
    } finally {
      setLoadingArtifacts((current) => ({
        ...current,
        [runId]: false,
      }));
    }
  }, []);

  const loadRuns = useCallback(async () => {
    try {
      const nextRuns = await automationService.getRuns(publicId);

      setRuns(nextRuns);
      setHistoryError(null);

      for (const run of nextRuns) {
        if (run.status === "completed") {
          void loadArtifacts(run.id);
        }
      }
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Unable to retrieve execution history.",
      );
    } finally {
      setIsLoadingRuns(false);
    }
  }, [publicId, loadArtifacts]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const hasActiveRun = runs.some(isActiveRun);

  useEffect(() => {
    if (!hasActiveRun) return;

    const interval = window.setInterval(() => {
      void loadRuns();
    }, 2500);

    return () => window.clearInterval(interval);
  }, [hasActiveRun, loadRuns]);

  const handleStartRun = async () => {
    if (isStarting || hasActiveRun) return;

    setIsStarting(true);
    setActionError(null);

    try {
      const run = await automationService.startRun(publicId);

      setRuns((currentRuns) => [
        run,
        ...currentRuns.filter((item) => item.id !== run.id),
      ]);

      void loadRuns();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to start this automation.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleRefreshArtifact = async (runId: string) => {
    requestedArtifacts.current.delete(runId);

    setArtifactErrors((current) => {
      const next = { ...current };
      delete next[runId];
      return next;
    });

    await loadArtifacts(runId);
  };

  if (isPending) {
    return (
      <main className="mt-14 min-h-screen bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
          <div className="mb-8 h-5 w-36 animate-pulse rounded bg-neutral-100" />
          <div className="mb-8 space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
            <div className="h-8 w-72 max-w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded bg-neutral-100" />
          </div>
          <div className="h-80 animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50" />
        </div>
      </main>
    );
  }

  if (isError || !automation) {
    return (
      <main className="mt-14 min-h-screen bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
          <Link
            href="/dashboard/automations"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            All automations
          </Link>

          <section className="mx-auto mt-16 max-w-md rounded-2xl border border-neutral-200 p-8 text-center">
            <CircleAlert className="mx-auto h-8 w-8 text-red-600" />
            <h1 className="mt-4 text-lg font-semibold text-neutral-950">
              Couldn&apos;t load automation
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              {error instanceof Error
                ? error.message
                : "This automation is unavailable."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#b70569] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9d045b]"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </section>
        </div>
      </main>
    );
  }

  const hostname = getHostname(automation.url);

  const latestCompletedRun = runs.find(
    (run) => run.status === "completed",
  );

  const latestArtifacts = latestCompletedRun
    ? artifactsByRun[latestCompletedRun.id]
    : undefined;

  const isLatestArtifactLoading = latestCompletedRun
    ? Boolean(loadingArtifacts[latestCompletedRun.id])
    : false;

  const latestArtifactError = latestCompletedRun
    ? artifactErrors[latestCompletedRun.id]
    : null;

  return (
    <main className="mt-14 min-h-screen bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
        {/* Navigation */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard/automations"
            className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            All automations
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium capitalize text-neutral-600">
              {automation.status}
            </span>

            <button
              type="button"
              aria-label="More automation options"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-900"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Automation heading */}
        <section className="mb-8">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Globe className="h-4 w-4" />
            <span>{hostname}</span>
            <span className="text-neutral-300">/</span>
            <span>Generation result</span>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-semibold tracking-tight text-neutral-950">
                {automation.name}
              </h1>

              {automation.description && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                  {automation.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4" />
                  Created {formatDate(automation.createdAt)}
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <Globe className="h-4 w-4" />
                  {hostname}
                </span>
              </div>

              <a
                href={automation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex max-w-full items-center gap-2 break-all text-sm text-[#b70569] hover:underline"
              >
                {automation.url}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>

            <button
              type="button"
              onClick={handleStartRun}
              disabled={isStarting || hasActiveRun}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#b70569] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#9d045b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting || hasActiveRun ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}

              {isStarting
                ? "Starting..."
                : hasActiveRun
                  ? "Automation running"
                  : "Run automation"}
            </button>
          </div>

          {actionError && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {actionError}
            </p>
          )}
        </section>

        {/* Original prompt */}
        <section className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-[#b70569]">
              <Play className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-neutral-950">
                Original prompt
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                The instructions used to generate this result
              </p>
            </div>
          </div>

          <div className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-neutral-100 bg-neutral-50 p-5 text-sm leading-7 text-neutral-700">
            {automation.instructions}
          </div>
        </section>

        {/* Main generated result */}
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-[#b70569]">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-neutral-950">
                  Generated result
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  The output produced by your automation
                </p>
              </div>
            </div>

            {latestCompletedRun && (
              <button
                type="button"
                onClick={() =>
                  void handleRefreshArtifact(latestCompletedRun.id)
                }
                disabled={isLatestArtifactLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    isLatestArtifactLoading ? "animate-spin" : ""
                  }`}
                />
                Refresh result
              </button>
            )}
          </div>

          <div className="p-6">
            {hasActiveRun ? (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-6">
                <div className="flex items-center gap-3">
                  <LoaderCircle className="h-5 w-5 animate-spin text-[#b70569]" />
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Your automation is running
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      The generated output will appear here when the run
                      finishes.
                    </p>
                  </div>
                </div>

                {runs
                  .filter(isActiveRun)
                  .map((run) => (
                    <div key={run.id} className="mt-5">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-neutral-500">
                        <span>
                          {run.currentAction || run.stage || "Waiting..."}
                        </span>
                        <span>{run.progress}%</span>
                      </div>

                      <div
                        role="progressbar"
                        aria-label="Automation progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={run.progress}
                        className="h-2 overflow-hidden rounded-full bg-white"
                      >
                        <div
                          className="h-full rounded-full bg-[#b70569] transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, run.progress),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : !latestCompletedRun ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 px-6 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-500">
                  <Play className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-base font-semibold text-neutral-900">
                  Nothing generated yet
                </h3>

                <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
                  Run this automation to generate your first result. Your
                  output will be saved here so you can review it later.
                </p>

                <button
                  type="button"
                  onClick={handleStartRun}
                  disabled={isStarting}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#b70569] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9d045b] disabled:opacity-60"
                >
                  {isStarting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {isStarting ? "Starting..." : "Generate result"}
                </button>
              </div>
            ) : latestArtifactError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-5"
              >
                <div className="flex items-start gap-3">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-800">
                      Unable to load the generated result
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-red-700">
                      {latestArtifactError}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void handleRefreshArtifact(latestCompletedRun.id)
                      }
                      className="mt-3 text-sm font-medium text-red-800 underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : latestArtifacts === undefined || isLatestArtifactLoading ? (
              <div className="flex items-center justify-center gap-3 py-14 text-sm text-neutral-500">
                <LoaderCircle className="h-5 w-5 animate-spin text-[#b70569]" />
                Loading generated result...
              </div>
            ) : latestArtifacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 px-6 py-12 text-center">
                <CircleAlert className="mx-auto h-7 w-7 text-neutral-400" />
                <h3 className="mt-3 text-sm font-semibold text-neutral-800">
                  No saved output found
                </h3>
                <p className="mt-1 text-sm leading-6 text-neutral-500">
                  This run completed, but the artifacts endpoint returned no
                  saved results.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void handleRefreshArtifact(latestCompletedRun.id)
                  }
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#b70569] hover:underline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                      Latest successful run
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Completed {formatDate(latestCompletedRun.finishedAt)}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                </div>

                {latestArtifacts.map((artifact) => (
                  <article
                    key={artifact.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-neutral-200"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-sm font-semibold text-neutral-900">
                          {artifact.name || "Automation output"}
                        </h3>

                        <p className="mt-1 text-xs text-neutral-500">
                          {artifact.type || "Generated artifact"}
                          {typeof artifact.itemCount === "number"
                            ? ` · ${artifact.itemCount} items`
                            : ""}
                        </p>
                      </div>

                      {artifact.storageUrl && (
                        <a
                          href={artifact.storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#b70569] hover:underline"
                        >
                          Open file
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>

                    <div className="p-4">
                      <pre className="max-h-[600px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-neutral-50 p-4 font-mono text-xs leading-6 text-neutral-800">
                        {formatArtifactContent(artifact.content)}
                      </pre>

                      <p className="mt-3 text-xs text-neutral-400">
                        Result created {formatDate(artifact.createdAt)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>


        {/* Execution history */}
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
              <History className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold text-neutral-950">
                Execution history
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Review previous runs and their status.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadRuns()}
              disabled={isLoadingRuns}
              aria-label="Refresh execution history"
              className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isLoadingRuns ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>

          {historyError && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p>{historyError}</p>
                <button
                  type="button"
                  onClick={() => void loadRuns()}
                  className="mt-1 font-medium underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {isLoadingRuns && runs.length === 0 ? (
            <div className="mt-6 flex items-center justify-center gap-2 py-10 text-sm text-neutral-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading execution history...
            </div>
          ) : runs.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-200 px-6 py-10 text-center">
              <History className="mx-auto h-8 w-8 text-neutral-400" />
              <h3 className="mt-4 text-sm font-medium text-neutral-800">
                No executions yet
              </h3>
              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Your previous automation runs will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {runs.map((run) => (
                <article
                  key={run.id}
                  className="rounded-xl border border-neutral-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5">
                        {run.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : run.status === "failed" ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : isActiveRun(run) ? (
                          <LoaderCircle className="h-5 w-5 animate-spin text-[#b70569]" />
                        ) : (
                          <Clock3 className="h-5 w-5 text-neutral-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="break-all font-mono text-sm text-neutral-800">
                          Run {run.id.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          Started: {formatDate(run.startedAt ?? run.createdAt)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyles(
                        run.status,
                      )}`}
                    >
                      {run.status}
                    </span>
                  </div>

                  {isActiveRun(run) && (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-neutral-500">
                        <span>
                          {run.currentAction || run.stage || "Waiting..."}
                        </span>
                        <span>{run.progress}%</span>
                      </div>

                      <div
                        role="progressbar"
                        aria-label="Run progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={run.progress}
                        className="h-2 overflow-hidden rounded-full bg-neutral-100"
                      >
                        <div
                          className="h-full rounded-full bg-[#b70569] transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, run.progress),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {run.error && (
                    <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {run.error}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-500">
                    <span>Created: {formatDate(run.createdAt)}</span>
                    {run.finishedAt && (
                      <span>Finished: {formatDate(run.finishedAt)}</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-6">
          <Link
            href="/dashboard/automations"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#b70569] hover:underline"
          >
            View all automations
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
