"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getVapiClient } from "@/lib/vapi";
import type { GeneratedQuestion, InterviewConfig } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type VapiCallStatus =
  | "idle"
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
- After all questions are answered, give a brief summary of the candidate's performance and end the interview politely.
- Keep your responses concise and conversational — this is a voice interview.
- Do NOT read aloud the topic labels in brackets.
- If the candidate asks you to repeat a question, do so verbatim.
- If the candidate says "skip", move to the next question.`;
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

          // Try to track which question we're on based on assistant messages
          if (role === "assistant") {
            setActiveQuestionIndex((prevIndex) => {
              // Move to next question when assistant speaks (after intro)
              const nextIndex = prevIndex + 1;
              return nextIndex < questions.length ? nextIndex : prevIndex;
            });
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
    setStatus("connecting");
    setErrorMessage(null);
    setConversation([]);
    setActiveQuestionIndex(-1);

    try {
      const vapi = getVapiClient();

      await vapi.start({
        name: "IntervueAI Interviewer",
        firstMessage: `Hi there! I'm Alex, and I'll be your interviewer today. We have ${questions.length} questions prepared for a ${config.experienceLevel}-level ${config.role} ${config.type} interview. Are you ready to get started?`,
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
