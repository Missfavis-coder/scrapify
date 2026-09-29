
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
    title: "Monthly sales report downloaded",
    description: "Download monthly sales report",
    status: "completed",
    time: "2 min ago",
  },
  {
    id: "2",
    title: "Product availability check started",
    description: "Checking Jumia for available products",
    status: "running",
    time: "8 min ago",
  },
  {
    id: "3",
    title: "Automation needs attention",
    description: "Supplier portal changed its login flow",
    status: "attention",
    time: "24 min ago",
  },
  {
    id: "4",
    title: "Automation created",
    description: "Find and compare competitor laptop prices",
    status: "created",
    time: "1 hr ago",
  },
];

const statusConfig: Record<
  ActivityStatus,
  {
    icon: typeof CheckCircle2;
    iconClass: string;
  }
> = {
  completed: {
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
  running: {
    icon: Play,
    iconClass: "text-blue-500",
  },
  attention: {
    icon: CircleAlert,
    iconClass: "text-amber-500",
  },
  created: {
    icon: Plus,
    iconClass: "text-primary",
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
    <section className="mt-18 rounded-2xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-secondary">
            Recent activity
          </h2>

          <p className="mt-0.5 text-sm text-neutral-600">
            Keep track of what your automations are doing.
          </p>
        </div>

        <button
          type="button"
          className="text-sm font-medium text-neutral-500 transition-colors hover:text-secondary cursor-pointer"
        >
          View all
        </button>
      </div>

      <div className="divide-y divide-neutral-200/50">
        {recentActivities.map((activity) => {
          return (
            <div
              key={activity.id}
              className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-neutral-100"
            >
              <ActivityIcon status={activity.status} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-secondary">
                  {activity.title}
                </p>

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

