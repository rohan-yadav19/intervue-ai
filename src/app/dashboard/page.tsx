"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DashboardWelcome } from "@/components/dashboard/DashboardWelcome";
import { InterviewList } from "@/components/interview/InterviewList";
import { getUserSessions } from "@/lib/interview-sessions";
import { ROUTES } from "@/lib/constants";
import { formatInterviewType, formatRole } from "@/lib/utils";
import type { Interview } from "@/types";
import type { InterviewSession } from "@/types";
import Link from "next/link";
import { START_INTERVIEW_HREF } from "@/lib/constants";

/** Map an InterviewSession (from Firestore) to the Interview shape used by InterviewCard */
function sessionToInterview(s: InterviewSession): Interview {
  return {
    id: s.id ?? "",
    title: `${s.jobRole} Interview`,
    role: "general", // sessions use free-text role; map to closest InterviewRole
    type: s.interviewType,
    date: s.completedAt.split("T")[0],
    status: s.status === "completed" ? "completed" : "in_progress",
    description: `${s.experienceLevel} level · ${s.techStack}`,
  };
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadState("ready"); // unauthenticated — show empty state
      return;
    }

    setLoadState("loading");
    getUserSessions(user.uid)
      .then((s) => {
        setSessions(s);
        setLoadState("ready");
      })
      .catch((err) => {
        console.error("Failed to load sessions:", err);
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        const isOffline =
          msg.includes("client is offline") ||
          msg.includes("network error") ||
          msg.includes("unavailable");
        if (isOffline) {
          setLoadState("offline");
          // Auto-retry after 3 s — increment retryCount to re-trigger the effect
          setTimeout(() => setRetryCount((n) => n + 1), 3000);
        } else {
          setLoadState("error");
        }
      });
  // retryCount intentionally included to trigger re-fetch on auto-retry
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, retryCount]);


  const interviews = sessions.map(sessionToInterview);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <DashboardWelcome />
      <section className="mt-10 sm:mt-12">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">My Interviews</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Your completed mock interview sessions.
            </p>
          </div>
          <Link
            href={START_INTERVIEW_HREF}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            + New Interview
          </Link>
        </div>

        {loadState === "loading" && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
            <svg className="h-6 w-6 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {loadState === "offline" && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
            <span className="text-xl">📡</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Connecting to database…</p>
              <p className="mt-0.5 text-amber-700 dark:text-amber-400/80">
                Retrying automatically. Check your internet connection if this persists.
              </p>
            </div>
            <button
              onClick={() => setRetryCount((n) => n + 1)}
              className="ml-auto shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
            >
              Retry now
            </button>
          </div>
        )}

        {loadState === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            Failed to load your interview sessions. Please refresh the page.
          </div>
        )}

        {loadState === "ready" && (
          <RealInterviewList sessions={sessions} />
        )}

      </section>
    </section>
  );
}

/** Renders a list of sessions with proper "View Feedback" links */
function RealInterviewList({ sessions }: { sessions: InterviewSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
        <p className="text-base font-medium">No interviews yet</p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Start a new mock interview and it will show up here.
        </p>
        <Link
          href={START_INTERVIEW_HREF}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Start New Interview
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: InterviewSession }) {
  const isCompleted = session.status === "completed";
  const date = new Date(session.completedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {formatRole(session.jobRole)}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{session.jobRole} Interview</h2>
        </div>
        <StatusPill completed={isCompleted} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500">Type</dt>
          <dd className="mt-0.5 font-medium">{formatInterviewType(session.interviewType)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Date</dt>
          <dd className="mt-0.5 font-medium">{date}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Experience</dt>
          <dd className="mt-0.5 font-medium capitalize">{session.experienceLevel}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Questions</dt>
          <dd className="mt-0.5 font-medium">{session.questions.length}</dd>
        </div>
      </dl>

      <div className="mt-5">
        {isCompleted ? (
          <Link
            href={ROUTES.interviewResult(session.id!)}
            className="flex h-9 w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            View Feedback
          </Link>
        ) : (
          <div className="flex h-9 w-full items-center justify-center rounded-xl border border-dashed border-zinc-200 px-4 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
            Feedback not available
          </div>
        )}
      </div>
    </article>
  );
}

function StatusPill({ completed }: { completed: boolean }) {
  return (
    <span
      className={
        completed
          ? "inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      }
    >
      {completed ? "Completed" : "Abandoned"}
    </span>
  );
}
