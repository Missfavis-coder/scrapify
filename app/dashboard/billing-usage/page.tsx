
"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Gauge,
  Receipt,
  Zap,
} from "lucide-react";

const usageStats = [

  {
    label: "Actor events",
    value: "3,842",
    description: "Processed this month",
    icon: Gauge,
  },
  {
    label: "Estimated cost",
    value: "$8.42",
    description: "Current billing period",
    icon: CircleDollarSign,
  },
];

const recentUsage = [
  {
    task: "Collect product prices",
    type: "Data collection",
    events: "184 events",
    cost: "$0.08",
    date: "Today, 10:42 AM",
  },
  {
    task: "Download monthly sales report",
    type: "File download",
    events: "46 events",
    cost: "$0.02",
    date: "Today, 9:18 AM",
  },
  {
    task: "Find available bags on Jumia",
    type: "Information search",
    events: "312 events",
    cost: "$0.11",
    date: "Yesterday, 6:32 PM",
  },
  {
    task: "Check competitor prices",
    type: "Website monitoring",
    events: "528 events",
    cost: "$0.18",
    date: "Yesterday, 2:14 PM",
  },
  {
    task: "Weekly reporting workflow",
    type: "Automated workflow",
    events: "96 events",
    cost: "$0.04",
    date: "Sep 22, 8:00 AM",
  },
];

const billingHistory = [
  {
    period: "September 2026",
    amount: "$8.42",
    status: "Current",
  },
  {
    period: "August 2026",
    amount: "$12.84",
    status: "Paid",
  },
  {
    period: "July 2026",
    amount: "$9.17",
    status: "Paid",
  },
];

export default function UsageBillingPage() {
  return (
    <main className="min-h-screen mt-16 bg-white px-4 py-6 text-secondary sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>

            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Usage & Billing
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">
              Keep track of your automation activity, Actor usage, and
              estimated costs.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-4 text-sm font-medium text-black transition hover:bg-black/[0.03] cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export usage
          </button>
        </div>

        {/* Current billing period */}
        <section className="mb-6 rounded-2xl border border-black/[0.08] bg-[#fafafa] p-5 sm:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#b70569]" />

                <span className="text-sm font-medium text-black">
                  Current billing period
                </span>
              </div>

              <p className="text-sm text-black/40">
                September 1 – September 30, 2026
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-black/40">
              <span className="h-2 w-2 rounded-full bg-[#b70569]" />
              Usage updates automatically
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {usageStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-black/[0.07] bg-white p-4"
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[#b70569]/10">
                    <Icon className="h-4 w-4 text-[#b70569]" />
                  </div>

                  <p className="text-2xl font-semibold tracking-tight text-black">
                    {stat.value}
                  </p>

                  <p className="mt-1 text-sm text-black/70">
                    {stat.label}
                  </p>

                  <p className="mt-1 text-xs text-black/35">
                    {stat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Usage + billing */}
        <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Usage breakdown */}
          <section className="rounded-2xl border border-black/[0.08] bg-white p-5 sm:p-6">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-black">
                Usage breakdown
              </h2>

              <p className="mt-1 text-sm text-black/40">
                How your automation activity is being used this month.
              </p>
            </div>

            <div className="space-y-5">
              <UsageBar
                label="Information searches"
                value="1,420"
                percentage={72}
              />

              <UsageBar
                label="Data collection"
                value="984"
                percentage={58}
              />

              <UsageBar
                label="Workflow executions"
                value="612"
                percentage={44}
              />

              <UsageBar
                label="Website monitoring"
                value="486"
                percentage={31}
              />

              <UsageBar
                label="File downloads"
                value="340"
                percentage={21}
              />
            </div>

            <div className="mt-6 flex items-center gap-2 border-t border-black/[0.07] pt-5 text-xs text-black/35">
              <CircleDollarSign className="h-3.5 w-3.5" />
              Usage is based on Actor events generated by your automations.
            </div>
          </section>

          {/* Billing plan */}
          <section className="relative overflow-hidden rounded-2xl border border-[#b70569]/20 bg-[#fef29e] p-5 sm:p-6">
            <div className="relative">
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#b70569]">
                    Billing
                  </p>

                  <h2 className="mt-2 text-xl font-semibold text-black">
                    Pay as you go
                  </h2>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#b70569]">
                  <Zap className="h-4 w-4 text-white" />
                </div>
              </div>

              <p className="text-sm leading-6 text-black/60">
                Run automations when you need them and pay based on the Actor
                events your workflows consume.
              </p>

              <div className="my-6 border-t border-black/10" />

              <div className="space-y-3">
                <PlanFeature text="Usage-based Actor billing" />
                <PlanFeature text="Saved workflows and schedules" />
                <PlanFeature text="Automatic usage tracking" />
                <PlanFeature text="No fixed automation limit" />
              </div>

              <button
                type="button"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#b70569] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#9e045c]"
              >
                Manage billing
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <p className="mt-3 text-center text-[11px] text-black/40">
                Charges are based on your automation usage.
              </p>
            </div>
          </section>
        </div>

        {/* Recent usage */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-black/[0.08] bg-white">
          <div className="flex flex-col justify-between gap-4 border-b border-black/[0.07] p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-black">
                Recent usage
              </h2>

              <p className="mt-1 text-sm text-black/40">
                Recent automation activity and estimated event costs.
              </p>
            </div>

            <Link
              href="/dashboard/runs"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#b70569] transition hover:text-[#9e045c]"
            >
              View all runs
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="divide-y divide-black/[0.06]">
            {recentUsage.map((item) => (
              <div
                key={`${item.task}-${item.date}`}
                className="flex flex-col gap-4 px-5 py-4 transition hover:bg-black/[0.015] sm:flex-row sm:items-center sm:px-6"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b70569]/10">
                    <CheckCircle2 className="h-4 w-4 text-[#b70569]" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-black">
                      {item.task}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-black/35">
                      <span>{item.type}</span>
                      <span>•</span>
                      <span>{item.events}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6 sm:justify-end">
                  <div className="flex items-center gap-2 text-xs text-black/35">
                    <Clock3 className="h-3.5 w-3.5" />
                    {item.date}
                  </div>

                  <span className="min-w-[52px] text-right text-sm font-medium text-black">
                    {item.cost}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Billing history */}
        <section className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white">
          <div className="border-b border-black/[0.07] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#b70569]/10">
                <Receipt className="h-4 w-4 text-[#b70569]" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-black">
                  Billing history
                </h2>

                <p className="mt-1 text-sm text-black/40">
                  Previous usage periods and charges.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-black/[0.06]">
            {billingHistory.map((item) => (
              <div
                key={item.period}
                className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <div>
                  <p className="text-sm font-medium text-black">
                    {item.period}
                  </p>

                  <p className="mt-1 text-xs text-black/35">
                    Automation and Actor usage
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      item.status === "Current"
                        ? "bg-[#fef29e] text-[#7b7000]"
                        : "bg-black/[0.04] text-black/50"
                    }`}
                  >
                    {item.status}
                  </span>

                  <span className="min-w-[55px] text-right text-sm font-medium text-black">
                    {item.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function UsageBar({
  label,
  value,
  percentage,
}: {
  label: string;
  value: string;
  percentage: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm text-black/65">{label}</span>

        <span className="text-xs text-black/40">
          {value} events
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full bg-[#b70569] transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-black/65">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#b70569]" />
      <span>{text}</span>
    </div>
  );
}

