import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary";

export function buttonClassName(
  variant: ButtonVariant = "primary",
  className?: string,
) {
  return cn(
    "inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto",
    variant === "primary" &&
      "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
    variant === "secondary" &&
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900",
    className,
  );
}
