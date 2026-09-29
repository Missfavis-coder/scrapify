import { CheckCircle2 } from "lucide-react";

interface StatProps {
  label: string;
  value: string;
  detail: string;
  icon: typeof CheckCircle2;
  warning?: boolean;
}

export default function Stat({
  label,
  value,
  detail,
  icon: Icon,
  warning = false,
}: StatProps) {
  return (
    <div className="rounded-2xl bg-neutral-900 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">
          {label}
        </span>

        <Icon
          size={16}
          className={
            warning
              ? "text-amber-500"
              : "text-neutral-600"
          }
        />
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">
          {value}
        </span>

        <span className="text-[11px] text-neutral-500">
          {detail}
        </span>
      </div>
    </div>
  );
}