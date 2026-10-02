"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
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
import type { InterviewConfig } from "@/types";

export function CreateInterviewForm() {
  const [values, setValues] = useState<InterviewConfigInput>(
    EMPTY_INTERVIEW_CONFIG,
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof InterviewConfigInput, string>>
  >({});
  const [submitted, setSubmitted] = useState<InterviewConfig | null>(null);

  function updateField<K extends keyof InterviewConfigInput>(
    field: K,
    value: InterviewConfigInput[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateInterviewConfig(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setSubmitted(null);
      return;
    }

    setSubmitted(toInterviewConfig(values));
  }

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
          />
          <SelectField
            label="Interview Type"
            name="type"
            required
            value={values.type}
            error={errors.type}
            options={INTERVIEW_TYPE_OPTIONS}
            onChange={(event) => updateField("type", event.target.value)}
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
        />
        <Button type="submit" className="mt-2">
          Generate Interview
        </Button>
      </form>

      <aside className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold tracking-tight">
          Interview configuration
        </h2>
        {submitted ? (
          <dl className="mt-4 space-y-3 text-sm">
            <ConfigRow label="Job role" value={submitted.role} />
            <ConfigRow
              label="Experience level"
              value={formatExperienceLevel(submitted.experienceLevel)}
            />
            <ConfigRow
              label="Interview type"
              value={formatInterviewType(submitted.type)}
            />
            <ConfigRow label="Tech stack" value={submitted.techStack} />
            <ConfigRow
              label="Number of questions"
              value={String(submitted.questionCount)}
            />
          </dl>
        ) : (
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Fill out the form and click Generate Interview to preview this
            session. Gemini and Vapi are not connected yet.
          </p>
        )}
      </aside>
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-zinc-100 pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}
