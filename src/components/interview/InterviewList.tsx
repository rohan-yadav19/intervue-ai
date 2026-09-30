import { InterviewCard } from "@/components/interview/InterviewCard";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { START_INTERVIEW_HREF } from "@/lib/constants";
import type { Interview } from "@/types";

type InterviewListProps = {
  interviews: Interview[];
};

export function InterviewList({ interviews }: InterviewListProps) {
  if (interviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
        <p className="text-base font-medium">No interviews yet</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Start a new mock interview and it will show up here.
        </p>
        <ButtonLink href={START_INTERVIEW_HREF} className="mt-6">
          Start New Interview
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {interviews.map((interview) => (
        <InterviewCard key={interview.id} interview={interview} />
      ))}
    </div>
  );
}
