import { InterviewCard } from "@/components/interview/InterviewCard";
import { SignedInUser } from "@/components/auth/SignedInUser";
import { MOCK_INTERVIEWS } from "@/lib/constants";

export default function InterviewsPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Mock interviews</h1>
      <div className="mt-2">
        <SignedInUser />
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Static placeholders only. Voice, AI, and persistence will be added later.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {MOCK_INTERVIEWS.map((interview) => (
          <InterviewCard key={interview.id} interview={interview} />
        ))}
      </div>
    </section>
  );
}
