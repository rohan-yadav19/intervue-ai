import Link from "next/link";
import { APP_NAME, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href={ROUTES.home}
      className={cn("inline-flex items-center gap-2.5", className)}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white">
        I
      </span>
      <span className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {APP_NAME}
      </span>
    </Link>
  );
}
