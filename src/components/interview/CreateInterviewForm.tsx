"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { InterviewSession } from "@/components/interview/InterviewSession";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import {
  EXPERIENCE_LEVEL_OPTIONS,
  INTERVIEW_TYPE_OPTIONS,
  QUESTION_COUNT_OPTIONS,
} from "@/lib/constants";
import {
  EMPTY_INTERVIEW_CONFIG,
  toInterviewConfig,
  validateInterviewConfig,
  type InterviewConfigInput,
} from "@/lib/interview-config";
import {
  formatExperienceLevel,
  formatInterviewType,
} from "@/lib/utils";
import type {
  GeneratedQuestion,
  GenerateQuestionsResponse,
  InterviewConfig,
} from "@/types";

type FormStatus = "idle" | "loading" | "success" | "error";

export function CreateInterviewForm() {
  const [values, setValues] = useState<InterviewConfigInput>(
    EMPTY_INTERVIEW_CONFIG,
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof InterviewConfigInput, string>>
  >({});

  const [status, setStatus] = useState<FormStatus>("idle");
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateQuestionsResponse | null>(null);
  const [showSession, setShowSession] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<InterviewConfig | null>(null);

  function updateField<K extends keyof InterviewConfigInput>(
    field: K,
    value: InterviewConfigInput[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateInterviewConfig(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const config = toInterviewConfig(values);

    setStatus("loading");
    setApiError(null);
    setResult(null);

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to generate questions.");
      }

      setResult(data as GenerateQuestionsResponse);
      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setApiError(message);
      setStatus("error");
    }
  }

  const isLoading = status === "loading";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <TextField
          label="Job Role"
          name="role"
          required
          placeholder="Frontend Engineer"
          value={values.role}
          error={errors.role}
          onChange={(event) => updateField("role", event.target.value)}
          disabled={isLoading}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Experience Level"
            name="experienceLevel"
            required
            value={values.experienceLevel}
            error={errors.experienceLevel}
            options={EXPERIENCE_LEVEL_OPTIONS}
            onChange={(event) =>
              updateField("experienceLevel", event.target.value)
            }
            disabled={isLoading}
          />
          <SelectField
            label="Interview Type"
            name="type"
            required
            value={values.type}
            error={errors.type}
            options={INTERVIEW_TYPE_OPTIONS}
            onChange={(event) => updateField("type", event.target.value)}
            disabled={isLoading}
          />
        </div>
        <TextField
          label="Tech Stack"
          name="techStack"
          required
          placeholder="React, TypeScript, Node.js"
          value={values.techStack}
          error={errors.techStack}
          onChange={(event) => updateField("techStack", event.target.value)}
          disabled={isLoading}
        />
        <SelectField
          label="Number of Questions"
          name="questionCount"
          required
          value={values.questionCount}
          error={errors.questionCount}
          options={QUESTION_COUNT_OPTIONS.map((option) => ({
            value: String(option.value),
            label: option.label,
          }))}
          onChange={(event) => updateField("questionCount", event.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" className="mt-2" disabled={isLoading}>
          {isLoading ? "Generating…" : "Generate Interview"}
        </Button>
      </form>

      <aside className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold tracking-tight">
          Interview configuration
        </h2>

        {/* Loading state */}
        {status === "loading" && (
          <div className="mt-6 flex flex-col items-center gap-3 py-8">
            <LoadingSpinner />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Generating questions with AI…
            </p>
          </div>
        )}

        {/* Error state */}
        {status === "error" && apiError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            <p className="font-medium">Generation failed</p>
            <p className="mt-1">{apiError}</p>
          </div>
        )}

        {/* Success state — config summary + questions */}
        {status === "success" && result && (
          <>
            <dl className="mt-4 space-y-3 text-sm">
              <ConfigRow label="Job role" value={result.interviewConfig.role} />
              <ConfigRow
                label="Experience level"
                value={formatExperienceLevel(
                  result.interviewConfig.experienceLevel,
                )}
              />
              <ConfigRow
                label="Interview type"
                value={formatInterviewType(result.interviewConfig.type)}
              />
              <ConfigRow
                label="Tech stack"
                value={result.interviewConfig.techStack}
              />
              <ConfigRow
                label="Number of questions"
                value={String(result.interviewConfig.questionCount)}
              />
            </dl>
          </>
        )}

        {/* Idle state */}
        {status === "idle" && (
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Fill out the form and click Generate Interview to create AI-powered
            interview questions.
          </p>
        )}
      </aside>

      {/* Generated questions — shown below the grid on success */}
      {status === "success" && result && result.questions.length > 0 && (
        <div className="lg:col-span-2">
          <GeneratedQuestions questions={result.questions} />
          {!showSession && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={() => {
                  setSessionConfig(toInterviewConfig(values));
                  setShowSession(true);
                }}
                variant="primary"
                className="gap-2 px-8"
              >
                <svg
                  className="h-5 w-5"
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
                Start Interview Session
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Interview Session — full width below everything */}
      {showSession && sessionConfig && result && (
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              Interview Session
            </h2>
            <button
              onClick={() => setShowSession(false)}
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              ← Back to questions
            </button>
          </div>
          <InterviewSession
            config={sessionConfig}
            questions={result.questions}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function GeneratedQuestions({
  questions,
}: {
  questions: GeneratedQuestion[];
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold tracking-tight">
        Generated Questions
        <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
          ({questions.length})
        </span>
      </h2>
      <ol className="mt-5 space-y-4">
        {questions.map((q, index) => (
          <li
            key={index}
            className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800/60 dark:bg-zinc-900/40"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {index + 1}
              </span>
              <div className="min-w-0">
                <span className="mb-1 inline-block rounded-full bg-zinc-200/70 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {q.topic}
                </span>
                <p className="mt-1 text-sm leading-relaxed">{q.question}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-indigo-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
