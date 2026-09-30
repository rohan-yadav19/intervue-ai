import { InterviewList } from "@/components/interview/InterviewList";
import { SignedInUser } from "@/components/auth/SignedInUser";
import { MOCK_INTERVIEWS } from "@/lib/constants";

export default function InterviewsPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mock interviews</h1>
      <div className="mt-2">
        <SignedInUser />
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Static placeholders only. Voice, AI, and persistence will be added later.
      </p>
      <div className="mt-8">
        <InterviewList interviews={MOCK_INTERVIEWS} />
      </div>
    </section>
  );
}
