import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type {
  GeneratedQuestion,
  InterviewFeedback,
  InterviewType,
  QuestionEvaluation,
  SessionConversationEntry,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Request shape                                                       */
/* ------------------------------------------------------------------ */

type GenerateFeedbackRequest = {
  sessionId: string;
  userId: string;
  jobRole: string;
  interviewType: InterviewType;
  experienceLevel: string;
  techStack: string;
  questions: GeneratedQuestion[];
  transcript: SessionConversationEntry[];
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Pairs each question with the best matching user answer from the transcript.
 * The interviewer reads the question aloud; the user's next utterance is
 * treated as the answer. If no user utterance follows a question, returns "".
 */
function matchAnswersToQuestions(
  questions: GeneratedQuestion[],
  transcript: SessionConversationEntry[],
): { question: GeneratedQuestion; answer: string }[] {
  // Build a list of user utterances only
  const userUtterances = transcript
    .filter((e) => e.role === "user")
    .map((e) => e.text.trim())
    .filter((t) => t.length > 0);

  // We'll walk through the transcript and attribute one user utterance per question.
  // Strategy: for each assistant message that contains the question text (or "Question N"),
  // capture the next user message.
  const pairs: { question: GeneratedQuestion; answer: string }[] = [];
  const usedUserIdxs = new Set<number>();

  for (let qi = 0; qi < questions.length; qi++) {
    const q = questions[qi];
    let answerIdx = -1;

    // Find the assistant message that introduced this question
    for (let ti = 0; ti < transcript.length; ti++) {
      if (transcript[ti].role !== "assistant") continue;
      const text = transcript[ti].text.toLowerCase();
      const qFrag = q.question.slice(0, 50).toLowerCase();
      const hasQuestionRef =
        text.includes(`question ${qi + 1}`) ||
        (qFrag.length > 10 && text.includes(qFrag));

      if (hasQuestionRef) {
        // Find the next user turn after this assistant message
        for (let ti2 = ti + 1; ti2 < transcript.length; ti2++) {
          if (transcript[ti2].role === "user") {
            // Map back to userUtterances index
            const uIdx = userUtterances.indexOf(transcript[ti2].text.trim());
            if (uIdx !== -1 && !usedUserIdxs.has(uIdx)) {
              answerIdx = uIdx;
              usedUserIdxs.add(uIdx);
            }
            break;
          }
        }
        break;
      }
    }

    // Fallback: assign the next unused user utterance in order
    if (answerIdx === -1) {
      for (let u = 0; u < userUtterances.length; u++) {
        if (!usedUserIdxs.has(u)) {
          answerIdx = u;
          usedUserIdxs.add(u);
          break;
        }
      }
    }

    pairs.push({
      question: q,
      answer: answerIdx !== -1 ? userUtterances[answerIdx] : "",
    });
  }

  return pairs;
}

function buildFeedbackPrompt(req: GenerateFeedbackRequest): string {
  const pairs = matchAnswersToQuestions(req.questions, req.transcript);

  const qaList = pairs
    .map(
      (p, i) =>
        `Q${i + 1} [${p.question.topic}]: ${p.question.question}\n` +
        `Answer: ${p.answer || "(no answer provided)"}`,
    )
    .join("\n\n");

  return `You are an expert technical interviewer evaluating a mock interview performance. Provide detailed, constructive feedback.

Interview Context:
- Role: ${req.jobRole}
- Experience Level: ${req.experienceLevel}
- Interview Type: ${req.interviewType}
- Tech Stack: ${req.techStack}

Questions & Answers:
${qaList}

Provide feedback in this EXACT JSON format (no markdown, no code fences):
{
  "overallScore": <integer 1-10>,
  "strengths": [<2-4 specific strength strings>],
  "weaknesses": [<2-4 specific area-to-improve strings>],
  "questionEvaluations": [
    {
      "question": "<exact question text>",
      "answer": "<candidate answer or empty string>",
      "score": <integer 1-10>,
      "strength": "<1-2 sentences on what was good, or 'No answer provided' if blank>",
      "improvement": "<1-2 sentences on how to improve>"
    }
  ],
  "suggestions": [<3-5 concrete, actionable improvement suggestions>]
}

Rules:
- overallScore must reflect the average quality of answers.
- If an answer is empty, score it 0 and note "No answer was provided."
- Keep each strength/weakness/suggestion to 1-2 sentences.
- Be specific to the tech stack and role.
- Return ONLY the JSON object. No markdown, no extra text.`;
}

/* ------------------------------------------------------------------ */
/*  Retry helpers (same pattern as generate-questions route)           */
/* ------------------------------------------------------------------ */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isRetryable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { status?: number }).status;
  if (typeof status === "number" && (status === 429 || status === 503)) return true;
  const msg = (error as { message?: string }).message ?? "";
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("fetch failed")
  );
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                        */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key is not configured." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const req = body as GenerateFeedbackRequest;
  if (!req.sessionId || !req.userId || !req.questions?.length) {
    return NextResponse.json(
      { error: "Missing required fields: sessionId, userId, questions." },
      { status: 400 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[feedback] Gemini retry ${attempt}/${MAX_RETRIES} after ${delay}ms`);
      await sleep(delay);
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: buildFeedbackPrompt(req),
        config: {
          temperature: 0.4,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
      });

      const text = (response.text ?? "").trim();
      if (!text) {
        return NextResponse.json(
          { error: "AI returned an empty response." },
          { status: 502 },
        );
      }

      let parsed: {
        overallScore: number;
        strengths: string[];
        weaknesses: string[];
        questionEvaluations: QuestionEvaluation[];
        suggestions: string[];
      };

      try {
        const cleaned = text
          .replace(/```(?:json)?\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("[feedback] Failed to parse Gemini response:", text.slice(0, 500));
        return NextResponse.json(
          { error: "Failed to parse AI feedback response." },
          { status: 502 },
        );
      }

      const feedback: InterviewFeedback = {
        sessionId: req.sessionId,
        userId: req.userId,
        overallScore: Math.min(10, Math.max(1, Math.round(parsed.overallScore ?? 5))),
        strengths: parsed.strengths ?? [],
        weaknesses: parsed.weaknesses ?? [],
        questionEvaluations: (parsed.questionEvaluations ?? []).map((qe) => ({
          question: qe.question ?? "",
          answer: qe.answer ?? "",
          score: Math.min(10, Math.max(0, Math.round(qe.score ?? 0))),
          strength: qe.strength ?? "",
          improvement: qe.improvement ?? "",
        })),
        suggestions: parsed.suggestions ?? [],
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json(feedback);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) {
        console.error("[feedback] Non-retryable Gemini error:", error);
        break;
      }
      console.warn(`[feedback] Transient error attempt ${attempt + 1}:`, error);
    }
  }

  console.error("[feedback] All retries exhausted:", lastError);
  return NextResponse.json(
    {
      error: isRetryable(lastError)
        ? "AI service is temporarily busy. Please try again."
        : "Failed to generate feedback.",
    },
    { status: isRetryable(lastError) ? 503 : 502 },
  );
}
