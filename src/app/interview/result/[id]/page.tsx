import Link from "next/link";
import { ROUTES } from "@/lib/constants";

type InterviewResultPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterviewResultPage({
  params,
}: InterviewResultPageProps) {
  const { id } = await params;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link
        href={ROUTES.dashboard}
        className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to dashboard
      </Link>

      <div className="mt-8 rounded-2xl border border-green-200 bg-green-50/60 p-6 dark:border-green-900/50 dark:bg-green-950/30">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-lg text-white">
            ✓
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-green-800 dark:text-green-300">
              Interview Saved Successfully
            </h1>
            <p className="mt-0.5 text-sm text-green-700 dark:text-green-400/80">
              Your interview session has been recorded.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold tracking-tight">Session Details</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Session ID:{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            {id}
          </code>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          AI-generated feedback is not available yet. Your interview transcript
          and questions have been saved and will be used for feedback once the
          feature is ready.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={ROUTES.createInterview}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          Start Another Interview
        </Link>
        <Link
          href={ROUTES.dashboard}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Go to Dashboard
        </Link>
      </div>
    </section>
  );
}
