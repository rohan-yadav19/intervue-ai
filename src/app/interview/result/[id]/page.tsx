"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ROUTES } from "@/lib/constants";
import {
  getInterviewSession,
  getFeedbackForSession,
  saveFeedback,
} from "@/lib/interview-sessions";
import type { InterviewFeedback, InterviewSession } from "@/types";
import { cn } from "@/lib/utils";


/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

/** True when the Firestore error is a transient network/offline error. */
function isOfflineError(err: unknown): boolean {
  const msg =
    (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("client is offline") ||
    msg.includes("failed to get document") ||
    msg.includes("network error") ||
    msg.includes("unavailable")
  );
}

export default function InterviewResultPage() {
  const params = useParams();
  const id = params.id as string;
  const { loading: authLoading } = useAuth();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [loadState, setLoadState] = useState<
    "waiting-auth" | "loading" | "generating" | "ready" | "not-found" | "error" | "offline"
  >("waiting-auth");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState("loading");
    try {
      // 1. Fetch the saved session
      const sess = await getInterviewSession(id);
      if (!sess) {
        setLoadState("not-found");
        return;
      }
      setSession(sess);

      // 2. Check if feedback already exists (avoid re-generating)
      const existing = await getFeedbackForSession(id);
      if (existing) {
        setFeedback(existing);
        setLoadState("ready");
        return;
      }

      // 3. Generate feedback via API
      setLoadState("generating");
      const res = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: id,
          userId: sess.userId,
          jobRole: sess.jobRole,
          interviewType: sess.interviewType,
          experienceLevel: sess.experienceLevel,
          techStack: sess.techStack,
          questions: sess.questions,
          transcript: sess.transcript,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate feedback.");
      }

      const generated = data as InterviewFeedback;

      // 4. Persist so future page loads skip Gemini
      try {
        const feedbackId = await saveFeedback(generated);
        generated.id = feedbackId;
      } catch (saveErr) {
        console.warn("Could not save feedback to Firestore:", saveErr);
        // Non-fatal — still show the feedback
      }

      setFeedback(generated);
      setLoadState("ready");
    } catch (err) {
      console.error("[ResultPage] Error:", err);
      if (isOfflineError(err)) {
        setLoadState("offline");
        // Auto-retry after 3 s — the Firestore SDK needs a moment to connect.
        setTimeout(() => load(), 3000);
        return;
      }
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
      setLoadState("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Wait for auth to settle, then load
  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);


  /* ---- Waiting for auth ---- */
  if (loadState === "waiting-auth") {
    return (
      <PageShell>
        <StatusCard icon="⏳" title="Checking authentication…" description="Please wait a moment." />
      </PageShell>
    );
  }

  /* ---- Loading ---- */
  if (loadState === "loading") {
    return (
      <PageShell>
        <StatusCard icon="⏳" title="Loading session…" description="Fetching your interview data." />
      </PageShell>
    );
  }

  /* ---- Generating ---- */
  if (loadState === "generating") {
    return (
      <PageShell>
        <StatusCard
          icon={<SpinnerIcon />}
          title="Generating AI Feedback…"
          description="Analysing your answers with Gemini. This takes about 10–15 seconds."
        />
      </PageShell>
    );
  }

  /* ---- Not found ---- */
  if (loadState === "not-found") {
    return (
      <PageShell>
        <StatusCard
          icon="🔍"
          title="Session not found"
          description={`No interview session exists with ID: ${id}`}
          variant="warning"
        />
      </PageShell>
    );
  }

  /* ---- Offline / retrying ---- */
  if (loadState === "offline") {
    return (
      <PageShell>
        <StatusCard
          icon="📡"
          title="Connecting to database…"
          description="You appear to be offline or the connection is slow. Retrying automatically…"
          variant="warning"
          action={
            <button
              onClick={() => load()}
              className="mt-4 rounded-xl border border-amber-300 bg-white px-5 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              Retry now
            </button>
          }
        />
      </PageShell>
    );
  }

  /* ---- Error ---- */
  if (loadState === "error") {
    return (
      <PageShell>
        <StatusCard
          icon="⚠️"
          title="Something went wrong"
          description={errorMessage ?? "Could not load feedback."}
          variant="error"
          action={
            <button
              onClick={() => load()}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try again
            </button>
          }
        />
      </PageShell>
    );
  }

  /* ---- Ready ---- */
  if (!feedback || !session) return null;

  const completedAt = session.completedAt
    ? new Date(session.completedAt).toLocaleDateString(undefined, {
        dateStyle: "long",
      })
    : "Unknown date";

  return (
    <PageShell>
      {/* Header banner */}
      <div className="rounded-2xl border border-green-200 bg-green-50/60 p-5 dark:border-green-900/50 dark:bg-green-950/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-lg text-white">
              ✓
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-green-800 dark:text-green-300">
                Interview Complete
              </h1>
              <p className="mt-0.5 text-sm text-green-700 dark:text-green-400/80">
                {session.jobRole} · {session.interviewType} · {completedAt}
              </p>
            </div>
          </div>
          <ScoreRing score={feedback.overallScore} />
        </div>
      </div>

      {/* Overall strengths & weaknesses */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <FeedbackBox
          title="Strengths"
          items={feedback.strengths}
          variant="positive"
          icon="✦"
        />
        <FeedbackBox
          title="Areas to Improve"
          items={feedback.weaknesses}
          variant="negative"
          icon="△"
        />
      </div>

      {/* Per-question evaluations */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Answer-by-Answer Evaluation
        </h2>
        <ol className="mt-4 space-y-4">
          {feedback.questionEvaluations.map((qe, i) => (
            <QuestionCard key={i} index={i} evaluation={qe} />
          ))}
        </ol>
      </section>

      {/* Improvement suggestions */}
      <section className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <h2 className="text-base font-semibold text-indigo-900 dark:text-indigo-300">
          💡 Improvement Suggestions
        </h2>
        <ul className="mt-3 space-y-2">
          {feedback.suggestions.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-indigo-800 dark:text-indigo-300/90">
              <span className="mt-0.5 shrink-0 text-indigo-400">{i + 1}.</span>
              {s}
            </li>
          ))}
        </ul>
      </section>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
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
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link
        href={ROUTES.dashboard}
        className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to dashboard
      </Link>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function StatusCard({
  icon,
  title,
  description,
  variant = "neutral",
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant?: "neutral" | "warning" | "error";
  action?: React.ReactNode;
}) {
  const colors = {
    neutral:
      "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60",
    warning:
      "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
    error:
      "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border p-10 text-center",
        colors[variant],
      )}
    >
      <span className="text-4xl">{icon}</span>
      <p className="mt-4 text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
      {action}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color =
    score >= 8
      ? "#22c55e"
      : score >= 6
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-zinc-200 dark:text-zinc-700"
          />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold">{score}</span>
          <span className="text-[10px] text-zinc-500">/10</span>
        </div>
      </div>
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Overall Score
      </span>
    </div>
  );
}

function FeedbackBox({
  title,
  items,
  variant,
  icon,
}: {
  title: string;
  items: string[];
  variant: "positive" | "negative";
  icon: string;
}) {
  const styles = {
    positive:
      "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    negative:
      "border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20",
  };
  const textStyles = {
    positive: "text-emerald-800 dark:text-emerald-300",
    negative: "text-rose-800 dark:text-rose-300",
  };
  const iconStyles = {
    positive: "text-emerald-500",
    negative: "text-rose-500",
  };

  return (
    <div className={cn("rounded-2xl border p-5", styles[variant])}>
      <h2 className={cn("text-sm font-semibold", textStyles[variant])}>
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
            <span className={cn("mt-0.5 shrink-0 font-bold", iconStyles[variant])}>
              {icon}
            </span>
            <span className={textStyles[variant]}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionCard({
  index,
  evaluation,
}: {
  index: number;
  evaluation: {
    question: string;
    answer: string;
    score: number;
    strength: string;
    improvement: string;
  };
}) {
  const score = evaluation.score;
  const scoreColor =
    score >= 8
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      : score >= 5
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";

  const hasAnswer = evaluation.answer.trim().length > 0;

  return (
    <li className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Question header */}
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {index + 1}
          </span>
          <p className="text-sm font-medium leading-snug">{evaluation.question}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold",
            scoreColor,
          )}
        >
          {score}/10
        </span>
      </div>

      {/* Candidate answer */}
      <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Your Answer
        </p>
        {hasAnswer ? (
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {evaluation.answer}
          </p>
        ) : (
          <p className="text-sm italic text-zinc-400 dark:text-zinc-500">
            No answer was captured for this question.
          </p>
        )}
      </div>

      {/* Eval rows */}
      <div className="grid divide-x divide-zinc-100 border-t border-zinc-100 dark:divide-zinc-800 dark:border-zinc-800 sm:grid-cols-2">
        <EvalRow label="What was good" text={evaluation.strength} variant="positive" />
        <EvalRow label="How to improve" text={evaluation.improvement} variant="neutral" />
      </div>
    </li>
  );
}

function EvalRow({
  label,
  text,
  variant,
}: {
  label: string;
  text: string;
  variant: "positive" | "neutral";
}) {
  return (
    <div className="px-4 py-3">
      <p
        className={cn(
          "mb-1 text-xs font-medium uppercase tracking-wide",
          variant === "positive"
            ? "text-emerald-600 dark:text-emerald-500"
            : "text-indigo-600 dark:text-indigo-400",
        )}
      >
        {label}
      </p>
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {text}
      </p>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="h-10 w-10 animate-spin text-indigo-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
