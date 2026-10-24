"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { InterviewSession } from "@/components/interview/InterviewSession";
import { ROUTES } from "@/lib/constants";
import { getInterviewPlan } from "@/lib/interview-plans";
import { saveInterviewSession } from "@/lib/interview-sessions";
import { formatInterviewType, formatExperienceLevel } from "@/lib/utils";
import type { InterviewPlan, InterviewSession as InterviewSessionType } from "@/types";
import type { ConversationEntry } from "@/hooks/useVapiInterview";

type PageState =
  | { tag: "loading" }
  | { tag: "not-found" }
  | { tag: "error"; message: string }
  | { tag: "ready"; plan: InterviewPlan }
  | { tag: "saving" }
  | { tag: "saved"; resultId: string };

export default function InterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const planId = params.id as string;

  const [pageState, setPageState] = useState<PageState>({ tag: "loading" });

  /* ---- Load the plan from Firestore ---- */
  useEffect(() => {
    if (authLoading) return;

    getInterviewPlan(planId)
      .then((plan) => {
        if (!plan) {
          setPageState({ tag: "not-found" });
          return;
        }
        setPageState({ tag: "ready", plan });
      })
      .catch((err) => {
        console.error("[InterviewRoom] Failed to load plan:", err);
        setPageState({
          tag: "error",
          message: err instanceof Error ? err.message : "Failed to load interview.",
        });
      });
  }, [planId, authLoading]);

  /* ---- Handle session end: save → redirect to result ---- */
  const handleSessionEnd = useCallback(
    async (conversation: ConversationEntry[], completedAllQuestions: boolean) => {
      if (pageState.tag !== "ready") return;
      if (!user) return;

      setPageState({ tag: "saving" });

      const plan = (pageState as { tag: "ready"; plan: InterviewPlan }).plan;

      const session: InterviewSessionType = {
        userId: user.uid,
        jobRole: plan.config.role,
        experienceLevel: plan.config.experienceLevel,
        interviewType: plan.config.type,
        techStack: plan.config.techStack,
        questions: plan.questions,
        transcript: conversation.map((e) => ({
          role: e.role,
          text: e.text,
          timestamp: e.timestamp,
        })),
        completedAt: new Date().toISOString(),
        status: completedAllQuestions ? "completed" : "abandoned",
      };

      try {
        const sessionId = await saveInterviewSession(session);
        setPageState({ tag: "saved", resultId: sessionId });
        router.push(ROUTES.interviewResult(sessionId));
      } catch (err) {
        console.error("[InterviewRoom] Failed to save session:", err);
        // Show error inline — don't lose the plan state
        setPageState({
          tag: "error",
          message:
            err instanceof Error
              ? err.message
              : "Failed to save interview session.",
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pageState, user, router],
  );

  /* ---- Render states ---- */

  if (pageState.tag === "loading") {
    return (
      <RoomShell title="Interview Room">
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-24 dark:border-zinc-700">
          <svg className="h-6 w-6 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </RoomShell>
    );
  }

  if (pageState.tag === "not-found") {
    return (
      <RoomShell title="Interview not found">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/20">
          <p className="text-base font-medium text-amber-800 dark:text-amber-300">Interview not found</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400/80">
            This interview plan doesn&apos;t exist or may have expired.
          </p>
          <Link
            href={ROUTES.createInterview}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Create New Interview
          </Link>
        </div>
      </RoomShell>
    );
  }

  if (pageState.tag === "error") {
    return (
      <RoomShell title="Interview Room">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <p className="text-base font-medium text-red-700 dark:text-red-400">
            Something went wrong
          </p>
          <p className="mt-1 text-sm text-red-600 dark:text-red-400/80">
            {pageState.message}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
            <Link
              href={ROUTES.dashboard}
              className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </RoomShell>
    );
  }

  if (pageState.tag === "saving") {
    return (
      <RoomShell title="Interview Complete">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50/50 py-24 text-center dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <svg className="h-8 w-8 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-base font-semibold text-indigo-900 dark:text-indigo-300">
            Saving your interview…
          </p>
          <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-400/80">
            Generating AI feedback. Redirecting shortly…
          </p>
        </div>
      </RoomShell>
    );
  }

  /* ---- Ready: render the full interview room ---- */
  if (pageState.tag !== "ready") return null;
  const { plan } = pageState;


  const subtitle = [
    plan.config.role,
    formatExperienceLevel(plan.config.experienceLevel),
    formatInterviewType(plan.config.type),
  ].join(" · ");

  return (
    <RoomShell title={`${plan.config.role} Interview`} subtitle={subtitle}>
      <InterviewSession
        config={plan.config}
        questions={plan.questions}
        onSessionEnd={handleSessionEnd}
      />
    </RoomShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout wrapper                                                      */
/* ------------------------------------------------------------------ */

function RoomShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12">
      <Link
        href={ROUTES.createInterview}
        className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        ← Back to create interview
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}
