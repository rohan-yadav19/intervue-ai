import { cn } from "@/lib/utils";
import type { InterviewStatus } from "@/types";

const STATUS_STYLES: Record<InterviewStatus, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  scheduled: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  in_progress: "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  completed: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
};

type StatusBadgeProps = {
  status: InterviewStatus;
  label: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
    >
      {label}
    </span>
  );
}
