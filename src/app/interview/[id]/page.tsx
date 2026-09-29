import Link from "next/link";
import { SignedInUser } from "@/components/auth/SignedInUser";
import { MOCK_INTERVIEWS, ROUTES } from "@/lib/constants";
import { formatRole } from "@/lib/utils";

type InterviewSessionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterviewSessionPage({
  params,
}: InterviewSessionPageProps) {
  const { id } = await params;
  const interview = MOCK_INTERVIEWS.find((item) => item.id === id);

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <Link
        href={ROUTES.interviews}
        className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← All interviews
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        {interview?.title ?? "Interview session"}
      </h1>
      <div className="mt-2">
        <SignedInUser />
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {interview
          ? `${formatRole(interview.role)} · ${interview.description}`
          : `Session id: ${id}`}
      </p>
      <div className="mt-8 rounded-xl border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700">
        Interview room placeholder. Recording and AI feedback are not wired yet.
      </div>
    </section>
  );
}
