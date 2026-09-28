import Link from "next/link";
import { ROUTES } from "@/lib/constants";
import { formatRole } from "@/lib/utils";
import type { Interview } from "@/types";

type InterviewCardProps = {
  interview: Interview;
};

export function InterviewCard({ interview }: InterviewCardProps) {
  return (
    <Link
      href={ROUTES.interview(interview.id)}
      className="block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {formatRole(interview.role)}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{interview.title}</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {interview.description}
      </p>
    </Link>
  );
}
