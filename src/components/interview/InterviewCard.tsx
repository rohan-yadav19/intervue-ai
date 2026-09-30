import { ButtonLink } from "@/components/ui/ButtonLink";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROUTES } from "@/lib/constants";
import {
  formatInterviewDate,
  formatInterviewStatus,
  formatInterviewType,
  formatRole,
} from "@/lib/utils";
import type { Interview } from "@/types";

type InterviewCardProps = {
  interview: Interview;
};

export function InterviewCard({ interview }: InterviewCardProps) {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {formatRole(interview.role)}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{interview.title}</h2>
        </div>
        <StatusBadge
          status={interview.status}
          label={formatInterviewStatus(interview.status)}
        />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">Interview type</dt>
          <dd className="mt-0.5 font-medium">
            {formatInterviewType(interview.type)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Date</dt>
          <dd className="mt-0.5 font-medium">
            {formatInterviewDate(interview.date)}
          </dd>
        </div>
      </dl>
      <div className="mt-5">
        <ButtonLink
          href={ROUTES.interview(interview.id)}
          variant="secondary"
          className="h-9 px-4"
          fullWidth
        >
          View Feedback
        </ButtonLink>
      </div>
    </article>
  );
}
