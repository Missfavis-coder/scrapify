
"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Globe2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";


type MonitorStatus = "Watching" | "Triggered" | "Paused";

type NotificationChannel = "email" | "whatsapp";

interface Monitor {
  id: string;
  name: string;
  url: string;
  task: string;
  status: MonitorStatus;
  frequency: string;
  lastChecked: string;
  lastChange: string;
  currentValue: string;
  previousValue: string;
  changeType: "up" | "down" | "changed" | "none";
  notifications: NotificationChannel[];
}

const monitors: Monitor[] = [
  {
    id: "1",
    name: "MacBook Pro availability",
    url: "apple.com/shop/buy-mac/macbook-pro",
    task: "Watch for MacBook Pro 14-inch becoming available",
    status: "Watching",
    frequency: "Every 30 minutes",
    lastChecked: "2 minutes ago",
    lastChange: "No change",
    currentValue: "Out of stock",
    previousValue: "Out of stock",
    changeType: "none",
    notifications: ["email", "whatsapp"],
  },
  {
    id: "2",
    name: "Frontend jobs at Stripe",
    url: "stripe.com/jobs",
    task: "Notify me when a new frontend engineering role appears",
    status: "Triggered",
    frequency: "Every 1 hour",
    lastChecked: "18 minutes ago",
    lastChange: "New role found",
    currentValue: "Frontend Engineer",
    previousValue: "No new roles",
    changeType: "changed",
    notifications: ["email"],
  },
  {
    id: "3",
    name: "Laptop price",
    url: "example-store.com/products/laptop",
    task: "Watch the price of this laptop",
    status: "Watching",
    frequency: "Every 2 hours",
    lastChecked: "41 minutes ago",
    lastChange: "Price decreased",
    currentValue: "$749",
    previousValue: "$799",
    changeType: "down",
    notifications: ["whatsapp"],
  },
  {
    id: "4",
    name: "Scholarship applications",
    url: "example.edu/scholarships",
    task: "Tell me when applications open",
    status: "Paused",
    frequency: "Every 6 hours",
    lastChecked: "Yesterday",
    lastChange: "No change",
    currentValue: "Closed",
    previousValue: "Closed",
    changeType: "none",
    notifications: [],
  },
];

export default function MonitorsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | MonitorStatus>(
    "All"
  );

  const filteredMonitors = useMemo(() => {
    return monitors.filter((monitor) => {
      const matchesSearch =
        monitor.name.toLowerCase().includes(search.toLowerCase()) ||
        monitor.url.toLowerCase().includes(search.toLowerCase()) ||
        monitor.task.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || monitor.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const watchingCount = monitors.filter(
    (monitor) => monitor.status === "Watching"
  ).length;

  const triggeredCount = monitors.filter(
    (monitor) => monitor.status === "Triggered"
  ).length;

  const pausedCount = monitors.filter(
    (monitor) => monitor.status === "Paused"
  ).length;

  return (
    <main className="min-h-screen">
      <div className="mt-14 px-6 py-8 lg:px-10">
        {/* Header */}
        <div className="flex flex-col gap-5 border-b border-neutral-200 pb-7 md:flex-row md:items-end md:justify-between">
          <div>

            <h1 className="md:text-2xl  text-xl font-semibold tracking-tight">
              Monitors
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-700">
              Tell getSkillMD what to watch on a website and we&apos;ll keep
              checking it for you.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </button>

            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#b70569] px-4 text-sm font-medium text-white transition hover:bg-[#99045a] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Create monitor
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 border-b border-neutral-200 sm:grid-cols-3">
          <Stat
            label="Watching"
            value={watchingCount}
            description="actively checking"
            icon={<Zap className="h-4 w-4" />}
          />

          <Stat
            label="Triggered"
            value={triggeredCount}
            description="changes detected"
            icon={<Bell className="h-4 w-4" />}
          />

          <Stat
            label="Paused"
            value={pausedCount}
            description="not currently checking"
            icon={<Pause className="h-4 w-4" />}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-neutral-200 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search monitors..."
              className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[#b70569] focus:ring-2 focus:ring-[#b70569]/10"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "All" | MonitorStatus)
              }
              className="h-10 appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-9 text-sm font-medium outline-none focus:border-[#b70569] cursor-pointer"
            >
              <option value="All">All monitors</option>
              <option value="Watching">Watching</option>
              <option value="Triggered">Triggered</option>
              <option value="Paused">Paused</option>
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 cursor-pointer" />
          </div>
        </div>

        {/* Monitor list */}
        <div className="overflow-hidden">
          {filteredMonitors.length > 0 ? (
            <div className="divide-y divide-neutral-200">
              {filteredMonitors.map((monitor) => (
                <MonitorRow key={monitor.id} monitor={monitor} />
              ))}
            </div>
          ) : (
            <EmptySearch />
          )}
        </div>
      </div>

      {showCreate && (
        <CreateMonitorModal onClose={() => setShowCreate(false)} />
      )}

      {showNotifications && (
        <NotificationSettingsModal
          onClose={() => setShowNotifications(false)}
        />
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-neutral-200 py-5 sm:border-b-0 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600">
        {icon}
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold">{value}</span>

          <span className="text-sm font-medium text-neutral-700">
            {label}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-neutral-400">{description}</p>
      </div>
    </div>
  );
}

function MonitorRow({ monitor }: { monitor: Monitor }) {
  const statusStyles = {
    Watching: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Triggered: "bg-[#b70569]/5 text-[#b70569] border-[#b70569]/10",
    Paused: "bg-neutral-100 text-neutral-500 border-neutral-200",
  };

  return (
    <div className="group flex flex-col gap-5 py-6 transition hover:bg-neutral-50/70 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white">
            <Globe2 className="h-4 w-4 text-neutral-500" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">
                {monitor.name}
              </h3>

              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyles[monitor.status]}`}
              >
                {monitor.status}
              </span>
            </div>

            <a
              href={`https://${monitor.url}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-neutral-400 hover:text-[#b70569]"
            >
              <span className="truncate">{monitor.url}</span>
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>

            <p className="mt-2 max-w-2xl text-sm text-neutral-600">
              {monitor.task}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 border-t border-neutral-100 pt-4 sm:grid-cols-5 lg:w-[720px] lg:border-t-0 lg:pt-0">
        <MonitorMeta
          label="Current result"
          value={monitor.currentValue}
          changeType={monitor.changeType}
        />

        <MonitorMeta
          label="Last change"
          value={monitor.lastChange}
          changeType={monitor.changeType}
        />

        <MonitorMeta
          label="Frequency"
          value={monitor.frequency}
        />

        <MonitorMeta
          label="Last checked"
          value={monitor.lastChecked}
        />

        <NotificationMeta channels={monitor.notifications} />
      </div>

      <button
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-neutral-400 transition hover:border-neutral-200 hover:bg-white hover:text-neutral-700 group-hover:flex"
        aria-label={`More options for ${monitor.name}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}

function MonitorMeta({
  label,
  value,
  changeType,
}: {
  label: string;
  value: string;
  changeType?: Monitor["changeType"];
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>

      <div className="mt-1 flex items-center gap-1.5">
        {changeType === "down" && (
          <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
        )}

        {changeType === "up" && (
          <TrendingUp className="h-3.5 w-3.5 text-red-500" />
        )}

        <p className="truncate text-xs font-medium text-neutral-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function NotificationMeta({
  channels,
}: {
  channels: NotificationChannel[];
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        Notifications
      </p>

      {channels.length === 0 ? (
        <p className="mt-1 text-xs font-medium text-neutral-400">
          Off
        </p>
      ) : (
        <div className="mt-1 flex items-center gap-1.5">
          {channels.includes("email") && (
            <span
              title="Email"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500"
            >
              <Mail className="h-3.5 w-3.5" />
            </span>
          )}

          {channels.includes("whatsapp") && (
            <span
              title="WhatsApp"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function EmptySearch() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200">
        <Search className="h-4 w-4 text-neutral-400" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">No monitors found</h3>

      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        Try changing your search or status filter.
      </p>
    </div>
  );
}


function CreateMonitorModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [task, setTask] = useState("");
  const [frequency, setFrequency] = useState("Every 1 hour");

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 px-4 py-6 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Create monitor
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Tell getSkillMD what you want to keep an eye on.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
          <div className="space-y-5">
            {/* URL */}
            <div>
              <label
                htmlFor="monitor-url"
                className="mb-2 block text-sm font-medium"
              >
                Website URL
              </label>

              <div className="relative">
                <Globe2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                <input
                  id="monitor-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/products/macbook"
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-[#b70569] focus:ring-2 focus:ring-[#b70569]/10"
                />
              </div>
            </div>

            {/* Task */}
            <div>
              <label
                htmlFor="monitor-task"
                className="mb-2 block text-sm font-medium"
              >
                What should we watch?
              </label>

              <textarea
                id="monitor-task"
                value={task}
                onChange={(event) => setTask(event.target.value)}
                placeholder="e.g. Tell me when this product becomes available or when its price changes."
                rows={4}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-neutral-400 focus:border-[#b70569] focus:ring-2 focus:ring-[#b70569]/10"
              />

              <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
                <Sparkles className="h-3.5 w-3.5" />
                Describe it naturally. You don&apos;t need to know selectors.
              </p>
            </div>

            {/* Frequency */}
            <div>
              <label
                htmlFor="monitor-frequency"
                className="mb-2 block text-sm font-medium"
              >
                Check frequency
              </label>

              <div className="relative">
                <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />

                <select
                  id="monitor-frequency"
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-[#b70569]"
                >
                  <option>Every 15 minutes</option>
                  <option>Every 30 minutes</option>
                  <option>Every 1 hour</option>
                  <option>Every 2 hours</option>
                  <option>Every 6 hours</option>
                  <option>Every 12 hours</option>
                  <option>Once a day</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              </div>
            </div>

            {/* Notification channels */}
            <div>
              <div className="mb-2">
                <label className="block text-sm font-medium">
                  Notify me via
                </label>

                <p className="mt-1 text-xs text-neutral-400">
                  Choose where you want to receive an alert when something
                  changes.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <NotificationOption
                  icon={<Mail className="h-4 w-4" />}
                  title="Email"
                  description="Get alerts in your inbox"
                  enabled={emailEnabled}
                  onClick={() => setEmailEnabled((current) => !current)}
                  destination="you@example.com"
                />

                <NotificationOption
                  icon={<MessageCircle className="h-4 w-4" />}
                  title="WhatsApp"
                  description="Get alerts directly on WhatsApp"
                  enabled={whatsappEnabled}
                  onClick={() => setWhatsappEnabled((current) => !current)}
                  destination="+234 801 234 5678"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50/60 px-6 py-4">
          <button
            onClick={onClose}
            className="h-10 rounded-lg px-4 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100"
          >
            Cancel
          </button>

          <button
            disabled={!url.trim() || !task.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#b70569] px-4 text-sm font-medium text-white transition hover:bg-[#99045a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            Start monitoring
          </button>
        </div>
      </div>
    </div>
  );
}



function NotificationOption({
  icon,
  title,
  description,
  enabled,
  onClick,
  destination,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
  destination: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-4 text-left transition ${
        enabled
          ? "border-[#b70569]/25 bg-[#b70569]/[0.03]"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              enabled
                ? "border-[#b70569]/20 bg-[#b70569]/5 text-[#b70569]"
                : "border-neutral-200 text-neutral-500"
            }`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium">{title}</p>

            <p className="mt-0.5 text-xs text-neutral-400">
              {description}
            </p>

            <p className="mt-2 truncate text-xs font-medium text-neutral-600">
              {destination}
            </p>
          </div>
        </div>

        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            enabled
              ? "border-[#b70569] bg-[#b70569] text-white"
              : "border-neutral-300 bg-white"
          }`}
        >
          {enabled && <Check className="h-3 w-3" />}
        </div>
      </div>
    </button>
  );
}

function NotificationSettingsModal({ onClose }: { onClose: () => void }) {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  return (
    <div 
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]"
    onClick={onClose}
    >
      <div 
      className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
      onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Notification settings
            </h2>

            <p className="mt-1 text-sm text-neutral-500">
              Choose where getSkillMD should send monitor alerts.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-6">
          <NotificationSetting
            icon={<Mail className="h-4 w-4" />}
            title="Email"
            destination="you@example.com"
            enabled={emailEnabled}
            onToggle={() => setEmailEnabled((current) => !current)}
          />

          <NotificationSetting
            icon={<MessageCircle className="h-4 w-4" />}
            title="WhatsApp"
            destination="+234 801 234 5678"
            enabled={whatsappEnabled}
            onToggle={() => setWhatsappEnabled((current) => !current)}
          />
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50/60 px-6 py-4">
          <p className="text-xs text-neutral-400">
            Changes apply to new monitors.
          </p>

          <button
            onClick={onClose}
            className="h-10 rounded-lg bg-[#b70569] px-4 text-sm font-medium text-white transition hover:bg-[#99045a]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationSetting({
  icon,
  title,
  destination,
  enabled,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  destination: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>

          <p className="mt-0.5 truncate text-xs text-neutral-400">
            {destination}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? "bg-[#b70569]" : "bg-neutral-200"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

