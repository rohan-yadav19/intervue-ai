import { InterviewCard } from "@/components/interview/InterviewCard";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { SignedInUser } from "@/components/auth/SignedInUser";
import { MOCK_INTERVIEWS } from "@/lib/constants";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <section className="mx-auto w-full max-w-5xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="mt-2">
          <SignedInUser />
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your mock interviews are ready when you are.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {MOCK_INTERVIEWS.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} />
          ))}
        </div>
      </section>
    </RequireAuth>
  );
}
