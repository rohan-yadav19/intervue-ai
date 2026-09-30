import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";
import { InterviewList } from "@/components/interview/InterviewList";
import { MOCK_INTERVIEWS } from "@/lib/constants";

export default function DashboardPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <DashboardWelcome />
      <section className="mt-10 sm:mt-12">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              My Interviews
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Static practice history for now. Nothing is saved to a database
              yet.
            </p>
          </div>
        </div>
        <InterviewList interviews={MOCK_INTERVIEWS} />
      </section>
    </section>
  );
}
