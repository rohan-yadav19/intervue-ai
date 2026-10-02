import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { ExperienceLevel, InterviewType, QuestionCount } from "@/types";

/* ------------------------------------------------------------------ */
/*  Request / response shapes                                         */
/* ------------------------------------------------------------------ */

type GenerateQuestionsRequest = {
  role: string;
  experienceLevel: ExperienceLevel;
  type: InterviewType;
  techStack: string;
  questionCount: QuestionCount;
};

type GeneratedQuestion = {
  question: string;
  topic: string;
};

type GenerateQuestionsResponse = {
  interviewConfig: GenerateQuestionsRequest;
  questions: GeneratedQuestion[];
};

/* ------------------------------------------------------------------ */
/*  Validation helpers                                                 */
/* ------------------------------------------------------------------ */

const VALID_EXPERIENCE_LEVELS = new Set<ExperienceLevel>(["entry", "mid", "senior"]);
const VALID_INTERVIEW_TYPES = new Set<InterviewType>([
  "technical",
  "behavioral",
  "system-design",
  "mixed",
]);
const VALID_QUESTION_COUNTS = new Set<QuestionCount>([5, 10, 15]);

function validateRequestBody(
  body: unknown,
): { data: GenerateQuestionsRequest } | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Request body is required." };
  }

  const { role, experienceLevel, type, techStack, questionCount } =
    body as Record<string, unknown>;

  if (typeof role !== "string" || !role.trim()) {
    return { error: "Job role is required." };
  }
  if (!VALID_EXPERIENCE_LEVELS.has(experienceLevel as ExperienceLevel)) {
    return { error: "Invalid experience level." };
  }
  if (!VALID_INTERVIEW_TYPES.has(type as InterviewType)) {
    return { error: "Invalid interview type." };
  }
  if (typeof techStack !== "string" || !techStack.trim()) {
    return { error: "Tech stack is required." };
  }
  if (!VALID_QUESTION_COUNTS.has(questionCount as QuestionCount)) {
    return { error: "Invalid question count." };
  }

  return {
    data: {
      role: role.trim(),
      experienceLevel: experienceLevel as ExperienceLevel,
      type: type as InterviewType,
      techStack: techStack.trim(),
      questionCount: questionCount as QuestionCount,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Prompt builder                                                     */
/* ------------------------------------------------------------------ */

function buildPrompt(config: GenerateQuestionsRequest): string {
  return `You are an expert technical interviewer. Generate exactly ${config.questionCount} interview questions for the following role and context.

Job Role: ${config.role}
Experience Level: ${config.experienceLevel}
Interview Type: ${config.type}
Tech Stack: ${config.techStack}

Rules:
- Generate exactly ${config.questionCount} questions — no more, no fewer.
- Tailor difficulty to the "${config.experienceLevel}" experience level.
- For "technical" interviews, focus on coding, algorithms, and tech-stack-specific questions.
- For "behavioral" interviews, focus on teamwork, leadership, conflict resolution, and past experiences.
- For "system-design" interviews, focus on architecture, scalability, and trade-off discussions.
- For "mixed" interviews, include a balanced mix of technical, behavioral, and system-design questions.
- Each question should have a short topic label (2-4 words) describing the category.
- Questions should be realistic, challenging, and relevant to the role.

Respond with a JSON array of objects, each with "question" (string) and "topic" (string) fields.
Example:
[
  { "question": "Explain how React's reconciliation algorithm works.", "topic": "React Internals" },
  { "question": "Describe a time you disagreed with a teammate.", "topic": "Conflict Resolution" }
]

Return ONLY the JSON array. No markdown, no code fences, no extra text.`;
}

/* ------------------------------------------------------------------ */
/*  Retry helpers                                                      */
/* ------------------------------------------------------------------ */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/** HTTP status codes that are safe to retry (transient server issues). */
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

/**
 * Returns true if the error is transient and safe to retry.
 * We only retry 429 (rate-limited) and 503 (service unavailable).
 * Auth errors (401, 403), bad requests (400), and other 4xx are NOT retried.
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  // The @google/genai SDK attaches `status` on ApiError
  const status = (error as { status?: number }).status;
  if (typeof status === "number" && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  // Also check for connection errors (TypeError: unusable, fetch failures)
  const message = (error as { message?: string }).message ?? "";
  if (
    message.includes("503") ||
    message.includes("429") ||
    message.includes("UNAVAILABLE") ||
    message.includes("unusable") ||
    message.includes("fetch failed") ||
    message.includes("ECONNRESET")
  ) {
    return true;
  }

  // Check nested cause
  const cause = (error as { cause?: unknown }).cause;
  if (cause && isRetryableError(cause)) {
    return true;
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  /* ---------- 1. Check API key ---------- */
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key is not configured. Add GEMINI_API_KEY to .env.local." },
      { status: 500 },
    );
  }

  /* ---------- 2. Parse & validate body ---------- */
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const result = validateRequestBody(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const config = result.data;

  /* ---------- 3. Call Gemini with retry ---------- */
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Exponential backoff: 0ms (first attempt), ~1s, ~2s, ~4s
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Gemini retry ${attempt}/${MAX_RETRIES} after ${delay}ms…`);
      await sleep(delay);
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: buildPrompt(config),
        config: {
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      const text = response.text ?? "";

      if (!text.trim()) {
        return NextResponse.json(
          { error: "AI returned an empty response. Please try again." },
          { status: 502 },
        );
      }

      /* ---------- 4. Parse Gemini response ---------- */
      let questions: GeneratedQuestion[];
      try {
        // Strip potential markdown code fences just in case
        const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```\s*/g, "").trim();
        questions = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse Gemini response:", text);
        return NextResponse.json(
          { error: "Failed to parse AI response. Please try again." },
          { status: 502 },
        );
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          { error: "AI returned an empty or invalid response." },
          { status: 502 },
        );
      }

      /* ---------- 5. Return structured response ---------- */
      const payload: GenerateQuestionsResponse = {
        interviewConfig: config,
        questions: questions.slice(0, config.questionCount).map((q, index) => ({
          question: typeof q.question === "string" ? q.question : `Question ${index + 1}`,
          topic: typeof q.topic === "string" ? q.topic : "General",
        })),
      };

      return NextResponse.json(payload);
    } catch (error) {
      lastError = error;

      // Only retry on transient errors; bail immediately on auth/client errors
      if (!isRetryableError(error)) {
        console.error("Gemini non-retryable error:", error);
        break;
      }

      console.warn(
        `Gemini transient error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  /* ---------- All retries exhausted or non-retryable ---------- */
  console.error("Gemini API error after retries:", lastError);

  // Determine if this was a transient failure (retries exhausted) or a permanent error
  if (isRetryableError(lastError)) {
    return NextResponse.json(
      { error: "Gemini is temporarily busy. Please try again in a moment." },
      { status: 503 },
    );
  }

  // Non-retryable errors: give a clean message without exposing raw Gemini details
  const status = (lastError as { status?: number })?.status;
  if (status === 401 || status === 403) {
    return NextResponse.json(
      { error: "Gemini API authentication failed. Check your API key." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { error: "AI generation failed. Please try again later." },
    { status: 502 },
  );
}
