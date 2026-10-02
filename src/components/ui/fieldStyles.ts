import { cn } from "@/lib/utils";

export function fieldControlClassName(invalid = false, className?: string) {
  return cn(
    "mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition-colors dark:bg-zinc-950",
    invalid
      ? "border-red-500 focus:border-red-500"
      : "border-zinc-300 focus:border-indigo-500 dark:border-zinc-700",
    className,
  );
}
