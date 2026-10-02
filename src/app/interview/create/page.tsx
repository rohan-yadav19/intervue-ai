import Link from "next/link";
import { CreateInterviewForm } from "@/components/interview/CreateInterviewForm";
import { ROUTES } from "@/lib/constants";

export default function CreateInterviewPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href={ROUTES.dashboard}
        className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Create New Interview
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base dark:text-zinc-400">
        Set up the role, level, and stack — then generate AI-powered interview
        questions with Google Gemini.
      </p>
      <div className="mt-8">
        <CreateInterviewForm />
      </div>
    </section>
  );
}
