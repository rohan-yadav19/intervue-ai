"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  useVapiInterview,
  type VapiCallStatus,
  type ConversationEntry,
} from "@/hooks/useVapiInterview";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { GeneratedQuestion, InterviewConfig } from "@/types";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type InterviewSessionProps = {
  config: InterviewConfig;
  questions: GeneratedQuestion[];
  /** Called once when the call ends, with the full transcript. */
  onSessionEnd?: (
    conversation: ConversationEntry[],
    completedAllQuestions: boolean,
  ) => void;
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function InterviewSession({
  config,
  questions,
  onSessionEnd,
}: InterviewSessionProps) {
  const {
    status,
    isSpeaking,
    volumeLevel,
    conversation,
    activeQuestionIndex,
    errorMessage,
    startCall,
    stopCall,
  } = useVapiInterview(config, questions);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  /** Guard to ensure onSessionEnd fires only once per call. */
  const sessionEndFiredRef = useRef(false);

  // Reset the guard when a new call starts
  useEffect(() => {
    if (status === "active") {
      sessionEndFiredRef.current = false;
    }
  }, [status]);

  // Fire callback when the call ends
  useEffect(() => {
    if (status === "ended" && !sessionEndFiredRef.current) {
      sessionEndFiredRef.current = true;
      const completedAll = activeQuestionIndex >= questions.length - 1;
      onSessionEnd?.(conversation, completedAll);
    }
  }, [status, activeQuestionIndex, questions.length, conversation, onSessionEnd]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const isIdle = status === "idle" || status === "error" || status === "ended";
  const isConnecting = status === "connecting" || status === "requesting-mic";
  const isActive = status === "active";
  const isEnding = status === "ending";

  // Calculate progress
  const answeredCount =
    activeQuestionIndex >= 0 ? activeQuestionIndex : 0;
  const progressPercent =
    questions.length > 0
      ? Math.round(
          ((status === "ended"
            ? questions.length
            : Math.min(answeredCount + 1, questions.length)) /
            questions.length) *
            100,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <StatusBanner status={status} errorMessage={errorMessage} />

      {/* Progress bar */}
      {(isActive || isEnding || status === "ended") && (
        <ProgressBar
          current={
            status === "ended"
              ? questions.length
              : Math.min(activeQuestionIndex + 1, questions.length)
          }
          total={questions.length}
          percent={progressPercent}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        {/* Left panel — Question tracker */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Questions ({questions.length})
          </h3>
          <ol className="mt-4 space-y-3">
            {questions.map((q, index) => {
              const isCurrent = index === activeQuestionIndex;
              const isDone =
                activeQuestionIndex > index ||
                status === "ended";

              return (
                <li
                  key={index}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-3 text-sm transition-all duration-300",
                    isCurrent
                      ? "border-indigo-300 bg-indigo-50/60 shadow-sm shadow-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:shadow-none"
                      : isDone
                        ? "border-green-200 bg-green-50/40 dark:border-green-900/50 dark:bg-green-950/20"
                        : "border-zinc-100 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/30",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : isDone
                          ? "bg-green-500 text-white"
                          : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
                    )}
                  >
                    {isDone ? "✓" : index + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="mb-0.5 inline-block rounded-full bg-zinc-200/70 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {q.topic}
                    </span>
                    <p
                      className={cn(
                        "mt-0.5 leading-relaxed",
                        isCurrent
                          ? "font-medium text-zinc-900 dark:text-zinc-50"
                          : "text-zinc-600 dark:text-zinc-400",
                      )}
                    >
                      {q.question}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Right panel — Call + Transcript */}
        <div className="space-y-5">
          {/* Voice visualizer */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white py-10 dark:border-zinc-800 dark:bg-zinc-950">
            <VoiceOrb
              isActive={isActive}
              isSpeaking={isSpeaking}
              volumeLevel={volumeLevel}
            />

            {/* Status text */}
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {status === "requesting-mic"
                ? "Requesting microphone access…"
                : isConnecting
                  ? "Connecting to interview…"
                  : isActive
                    ? isSpeaking
                      ? "Alex is speaking…"
                      : "Listening to your answer…"
                    : isEnding
                      ? "Ending call…"
                      : status === "ended"
                        ? "Interview ended"
                        : "Ready to start"}
            </p>

            {/* Active question badge */}
            {isActive && activeQuestionIndex >= 0 && (
              <p className="mt-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                Question {activeQuestionIndex + 1} of {questions.length}
              </p>
            )}

            {/* Controls */}
            <div className="mt-5 flex items-center gap-3">
              {isIdle && (
                <Button onClick={startCall} variant="primary">
                  {status === "ended"
                    ? "Restart Interview"
                    : status === "error"
                      ? "Try Again"
                      : "Start Interview"}
                </Button>
              )}
              {isConnecting && (
                <Button variant="secondary" disabled>
                  <LoadingDots />
                  <span className="ml-2">
                    {status === "requesting-mic"
                      ? "Checking microphone…"
                      : "Connecting…"}
                  </span>
                </Button>
              )}
              {(isActive || isEnding) && (
                <Button
                  onClick={stopCall}
                  variant="secondary"
                  disabled={isEnding}
                  className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  {isEnding ? "Ending…" : "End Interview"}
                </Button>
              )}
            </div>
          </div>

          {/* Transcript */}
          <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Live Transcript
              </h3>
              {conversation.length > 0 && (
                <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                  {conversation.length}{" "}
                  {conversation.length === 1 ? "message" : "messages"}
                </span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto p-5">
              {conversation.length === 0 ? (
                <p className="text-center text-sm text-zinc-400 dark:text-zinc-500">
                  {isActive
                    ? "Waiting for speech…"
                    : "Transcript will appear here once the interview starts."}
                </p>
              ) : (
                <div className="space-y-3">
                  {conversation.map((entry, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-2 text-sm",
                        entry.role === "assistant" ? "" : "justify-end",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-xl px-3.5 py-2.5",
                          entry.role === "assistant"
                            ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                            : "bg-indigo-600 text-white",
                        )}
                      >
                        <span className="mb-0.5 block text-xs font-semibold opacity-70">
                          {entry.role === "assistant" ? "Alex (AI)" : "You"}
                        </span>
                        {entry.text}
                      </div>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusBanner({
  status,
  errorMessage,
}: {
  status: VapiCallStatus;
  errorMessage: string | null;
}) {
  if (status === "error" && errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900/50 dark:bg-red-950/30">
        <p className="font-medium text-red-700 dark:text-red-400">
          {errorMessage.includes("microphone") ||
          errorMessage.includes("Microphone")
            ? "Microphone Error"
            : "Connection Error"}
        </p>
        <p className="mt-1 text-red-600 dark:text-red-400/80">{errorMessage}</p>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm dark:border-green-900/50 dark:bg-green-950/30">
        <p className="font-medium text-green-700 dark:text-green-400">
          Interview Complete
        </p>
        <p className="mt-1 text-green-600 dark:text-green-400/80">
          Great job! Your interview session has ended. Review the transcript
          above.
        </p>
      </div>
    );
  }

  return null;
}

function ProgressBar({
  current,
  total,
  percent,
}: {
  current: number;
  total: number;
  percent: number;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Progress
        </span>
        <span className="tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
          {current}/{total}
        </span>
      </div>
      <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function VoiceOrb({
  isActive,
  isSpeaking,
  volumeLevel,
}: {
  isActive: boolean;
  isSpeaking: boolean;
  volumeLevel: number;
}) {
  const scale = isActive ? 1 + volumeLevel * 0.5 : 1;
  const glowOpacity = isActive ? 0.15 + volumeLevel * 0.4 : 0;

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      {/* Glow ring */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-150"
        style={{
          background: `radial-gradient(circle, rgba(99, 102, 241, ${glowOpacity}) 0%, transparent 70%)`,
          transform: `scale(${1 + volumeLevel * 0.8})`,
        }}
      />
      {/* Pulse ring */}
      {isSpeaking && (
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400/20" />
      )}
      {/* Orb */}
      <div
        className={cn(
          "relative z-10 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-150",
          isActive
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30"
            : "bg-zinc-200 dark:bg-zinc-700",
        )}
        style={{ transform: `scale(${scale})` }}
      >
        {/* Mic icon */}
        <svg
          className={cn(
            "h-8 w-8 transition-colors",
            isActive ? "text-white" : "text-zinc-500 dark:text-zinc-400",
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"
          />
        </svg>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
    </span>
  );
}
