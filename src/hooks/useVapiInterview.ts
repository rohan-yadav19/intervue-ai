"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getVapiClient } from "@/lib/vapi";
import type { GeneratedQuestion, InterviewConfig } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type VapiCallStatus =
  | "idle"
  | "requesting-mic"
  | "connecting"
  | "active"
  | "ending"
  | "ended"
  | "error";

export type ConversationEntry = {
  role: "assistant" | "user";
  text: string;
  timestamp: number;
};

export type UseVapiInterviewReturn = {
  /** Current call status */
  status: VapiCallStatus;
  /** Whether the assistant is currently speaking */
  isSpeaking: boolean;
  /** Real-time volume level (0–1) */
  volumeLevel: number;
  /** Conversation transcript entries */
  conversation: ConversationEntry[];
  /** Index of the question currently being asked (0-based), -1 if intro */
  activeQuestionIndex: number;
  /** Error message, if any */
  errorMessage: string | null;
  /** Start the Vapi call with the generated questions */
  startCall: () => Promise<void>;
  /** Stop / end the Vapi call */
  stopCall: () => void;
};

/* ------------------------------------------------------------------ */
/*  Prompt builder                                                     */
/* ------------------------------------------------------------------ */

function buildSystemPrompt(
  config: InterviewConfig,
  questions: GeneratedQuestion[],
): string {
  const questionsList = questions
    .map((q, i) => `${i + 1}. [${q.topic}] ${q.question}`)
    .join("\n");

  return `You are a professional technical interviewer conducting a ${config.type} interview for a ${config.experienceLevel}-level ${config.role} position.

Tech stack: ${config.techStack}

You have exactly ${questions.length} prepared questions. Ask them ONE AT A TIME in order. After the candidate answers each question, give brief, constructive feedback (1–2 sentences) and then ask the next question.

QUESTIONS:
${questionsList}

RULES:
- Start with a brief, warm introduction. State your name is "Alex" and you'll be conducting today's interview.
- Ask questions exactly as written above, one at a time.
- Wait for the candidate to finish speaking before responding.
- Provide short, encouraging feedback after each answer.
- After ALL ${questions.length} questions are answered, give a brief summary of the candidate's performance and end the interview politely. Say "That concludes our interview" to signal completion.
- Keep your responses concise and conversational — this is a voice interview.
- Do NOT read aloud the topic labels in brackets.
- If the candidate asks you to repeat a question, do so verbatim.
- If the candidate says "skip", move to the next question.
- IMPORTANT: Always state which question number you are on before asking, like "Question 1:", "Question 2:", etc.`;
}

/* ------------------------------------------------------------------ */
/*  Question-index detection                                           */
/* ------------------------------------------------------------------ */

/**
 * Attempts to detect which question the AI is currently asking by
 * matching the transcript text against the list of known questions.
 * Falls back to a regex that catches "Question N" patterns.
 */
function detectQuestionIndex(
  text: string,
  questions: GeneratedQuestion[],
): number | null {
  // Strategy 1: Look for "question N" pattern in the text (e.g. "Question 3:")
  const numberMatch = text.match(/question\s+(\d+)/i);
  if (numberMatch) {
    const n = parseInt(numberMatch[1], 10);
    if (n >= 1 && n <= questions.length) {
      return n - 1; // zero-based
    }
  }

  // Strategy 2: Fuzzy-match against question text fragments (first 40 chars)
  for (let i = 0; i < questions.length; i++) {
    const fragment = questions[i].question.slice(0, 50).toLowerCase();
    if (fragment.length > 15 && text.toLowerCase().includes(fragment)) {
      return i;
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Microphone permission helper                                       */
/* ------------------------------------------------------------------ */

async function requestMicrophoneAccess(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately release the stream — Vapi will request its own
    stream.getTracks().forEach((t) => t.stop());
  } catch (err) {
    const error = err as DOMException;
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      throw new Error(
        "Microphone permission was denied. Please allow microphone access in your browser settings and try again.",
      );
    }
    if (error.name === "NotFoundError") {
      throw new Error(
        "No microphone was found. Please connect a microphone and try again.",
      );
    }
    throw new Error(
      `Microphone error: ${error.message || "Unable to access microphone."}`,
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useVapiInterview(
  config: InterviewConfig,
  questions: GeneratedQuestion[],
): UseVapiInterviewReturn {
  const [status, setStatus] = useState<VapiCallStatus>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** Track whether the hook is mounted to avoid state updates after unmount */
  const mountedRef = useRef(true);
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---- Event bindings ---- */
  useEffect(() => {
    const vapi = getVapiClient();

    function onCallStart() {
      if (!mountedRef.current) return;
      setStatus("active");
      setActiveQuestionIndex(-1);
      setErrorMessage(null);
    }

    function onCallEnd() {
      if (!mountedRef.current) return;
      setStatus("ended");
      setIsSpeaking(false);
      setVolumeLevel(0);
    }

    function onSpeechStart() {
      if (!mountedRef.current) return;
      setIsSpeaking(true);
    }

    function onSpeechEnd() {
      if (!mountedRef.current) return;
      setIsSpeaking(false);
    }

    function onVolumeLevel(level: number) {
      if (!mountedRef.current) return;
      setVolumeLevel(level);
    }

    function onError(error: unknown) {
      if (!mountedRef.current) return;
      console.error("Vapi error:", error);
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String((error as { message: unknown }).message)
            : "An unexpected error occurred.";
      setErrorMessage(msg);
      setStatus("error");
    }

    function onMessage(message: Record<string, unknown>) {
      if (!mountedRef.current) return;

      // Handle transcript messages
      if (message.type === "transcript") {
        const role = message.role === "assistant" ? "assistant" : "user";
        const transcriptType = message.transcriptType as string;
        const transcript = message.transcript as string;

        if (transcriptType === "final" && transcript) {
          setConversation((prev) => [
            ...prev,
            { role, text: transcript, timestamp: Date.now() },
          ]);

          // Track which question we're on based on assistant speech
          if (role === "assistant") {
            const detected = detectQuestionIndex(
              transcript,
              questionsRef.current,
            );
            if (detected !== null) {
              setActiveQuestionIndex(detected);
            }
          }
        }
      }
    }

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("volume-level", onVolumeLevel);
    vapi.on("error", onError);
    vapi.on("message", onMessage);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("volume-level", onVolumeLevel);
      vapi.off("error", onError);
      vapi.off("message", onMessage);
    };
  }, [questions]);

  /* ---- Actions ---- */

  const startCall = useCallback(async () => {
    setErrorMessage(null);
    setConversation([]);
    setActiveQuestionIndex(-1);

    // Step 1: Request microphone permission first
    setStatus("requesting-mic");
    try {
      await requestMicrophoneAccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Microphone access failed.";
      setErrorMessage(message);
      setStatus("error");
      return;
    }

    // Step 2: Start the Vapi call
    setStatus("connecting");
    try {
      const vapi = getVapiClient();

      await vapi.start({
        firstMessage: `Hi there! I'm Alex, and I'll be your interviewer today. We have ${questions.length} questions prepared for a ${config.experienceLevel}-level ${config.role} ${config.type} interview. Let's begin! Question 1: ${questions[0]?.question ?? ""}`,
        model: {
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(config, questions),
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: "21m00Tcm4TlvDq8ikWAM", // "Rachel" — natural, professional voice
        },
      });
    } catch (err) {
      console.error("Failed to start Vapi call:", err);
      const message =
        err instanceof Error ? err.message : "Failed to start interview call.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [config, questions]);

  const stopCall = useCallback(() => {
    setStatus("ending");
    try {
      const vapi = getVapiClient();
      vapi.stop();
    } catch (err) {
      console.error("Failed to stop Vapi call:", err);
    }
  }, []);

  return {
    status,
    isSpeaking,
    volumeLevel,
    conversation,
    activeQuestionIndex,
    errorMessage,
    startCall,
    stopCall,
  };
}
