"use client";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Play,
  Plus,
} from "lucide-react";

type ActivityStatus =
  | "completed"
  | "running"
  | "attention"
  | "created";

interface Activity {
  id: string;
  title: string;
  description: string;
  status: ActivityStatus;
  time: string;
}

const recentActivities: Activity[] = [
  {
    id: "1",
    title: "Automation completed",
    description: "Download monthly sales report",
    status: "completed",
    time: "2 min ago",
  },
  {
    id: "2",
    title: "Automation is running",
    description: "Check product availability on Jumia",
    status: "running",
    time: "8 min ago",
  },
  {
    id: "3",
    title: "Automation needs attention",
    description: "Submit invoice to supplier portal",
    status: "attention",
    time: "24 min ago",
  },
  {
    id: "4",
    title: "Automation created",
    description: "Find competitor prices",
    status: "created",
    time: "1 hr ago",
  },
];

const statusConfig: Record<
  ActivityStatus,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
    labelClass: string;
  }
> = {
  completed: {
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    labelClass: "text-emerald-600 dark:text-emerald-400",
  },
  running: {
    icon: Play,
    iconClass: "text-blue-500",
    labelClass: "text-blue-600 dark:text-blue-400",
  },
  attention: {
    icon: CircleAlert,
    iconClass: "text-amber-500",
    labelClass: "text-amber-600 dark:text-amber-400",
  },
  created: {
    icon: Plus,
    iconClass: "text-primary",
    labelClass: "text-primary",
  },
};

function ActivityIcon({
  status,
}: {
  status: ActivityStatus;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#fef29e]/10">
      <Icon
        className={`size-4 ${config.iconClass}`}
        strokeWidth={2}
      />
    </div>
  );
}

export default function RecentActivity() {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white mt-18">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-secondary">
            Recent activity
          </h2>

          <p className="mt-0.5 text-sm text-neutral-600">
            See what your automations have been doing.
          </p>
        </div>

        <button
          type="button"
          className="text-sm font-medium text-neutral-500 transition-colors hover:text-secondary"
        >
          View all
        </button>
      </div>

      <div className="divide-y divide-border/50">
        {recentActivities.map((activity) => {
          const config = statusConfig[activity.status];

          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
            >
              <ActivityIcon status={activity.status} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-secondary">
                    {activity.title}
                  </p>
                </div>

                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {activity.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 text-xs text-primary">
                <Clock3 className="size-3.5" />
                <span>{activity.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}