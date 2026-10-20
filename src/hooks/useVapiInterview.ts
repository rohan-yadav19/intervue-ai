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
  /** True while the transcript is still streaming (partial). Becomes false on final. */
  isPartial?: boolean;
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

  // Stable ref for config — lets startCall read latest config without being recreated
  const configRef = useRef(config);
  configRef.current = config;

  // Guard: true while a Vapi call is active (prevents double-start in React Strict Mode)
  const callActiveRef = useRef(false);

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
      console.log("[Vapi] ✅ Connected — call started");
      callActiveRef.current = true;
      setStatus("active");
      setActiveQuestionIndex(-1);
      setErrorMessage(null);
    }

    function onCallEnd() {
      if (!mountedRef.current) return;
      console.log("[Vapi] 📞 Call ended");
      callActiveRef.current = false;
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
      console.error("[Vapi] ❌ Call error:", error);
      callActiveRef.current = false;
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

      // Log every message type so we can see what Vapi actually sends
      console.log("[Vapi] 📨 message received — type:", message.type, message);

      /* ---- conversation-update: reliable fallback ---- */
      // Vapi sends this after every completed exchange. It carries
      // messagesOpenAIFormatted: Array<{role, content}> with the full history.
      // We use it to reconcile the conversation state. This fires even when
      // real-time `transcript` events are disabled or absent (e.g. the
      // firstMessage utterance often skips transcript events entirely).
      if (message.type === "conversation-update") {
        const raw = message.messagesOpenAIFormatted as
          | Array<{ role: string; content: string | null }>
          | undefined;

        if (Array.isArray(raw)) {
          setConversation((prev) => {
            // Build a deduplicated list from the server's source-of-truth.
            // Skip system messages; keep assistant + user only.
            const finalized: ConversationEntry[] = raw
              .filter(
                (m) =>
                  (m.role === "assistant" || m.role === "user") &&
                  typeof m.content === "string" &&
                  m.content.trim().length > 0,
              )
              .map((m, idx) => ({
                role: m.role as "assistant" | "user",
                text: m.content as string,
                timestamp: Date.now() + idx, // preserve order; fine for display
                isPartial: false,
              }));

            if (finalized.length === 0) return prev;

            // Merge: remove any existing partials and replace the whole list
            // with the authoritative server version. Partials (isPartial:true)
            // were live previews; the conversation-update is the ground truth.
            const existingFinals = prev.filter((e) => !e.isPartial);

            // If the server list is already reflected in our state, skip update
            // to avoid a pointless re-render.
            if (
              existingFinals.length === finalized.length &&
              existingFinals.every(
                (e, i) =>
                  e.role === finalized[i].role && e.text === finalized[i].text,
              )
            ) {
              return prev;
            }

            console.log(
              `[Vapi] 🔄 conversation-update — syncing ${finalized.length} message(s) from server`,
            );
            return finalized;
          });
        }
        return; // conversation-update handled; no further processing needed
      }

      /* ---- transcript events: live streaming previews ---- */
      if (message.type !== "transcript") return;

      const role = message.role === "assistant" ? "assistant" : "user";
      const transcriptType = message.transcriptType as string; // "partial" | "final"
      const transcript = message.transcript as string;

      console.log(
        `[Vapi] 📝 transcript — speaker: ${
          role === "assistant" ? "Interviewer" : "You"
        }, type: ${transcriptType}, text: "${(transcript ?? "").slice(0, 80)}"`,
      );

      if (!transcript) return;

      if (transcriptType === "partial") {
        // Live-update the in-progress message for this role.
        // If the last entry in the conversation is already a partial for this role,
        // update it in-place to avoid accumulating dozens of separate entries.
        setConversation((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === role && last.isPartial) {
            return [
              ...prev.slice(0, prev.length - 1),
              { role, text: transcript, timestamp: last.timestamp, isPartial: true },
            ];
          }
          // No existing partial for this role — append a new one
          return [
            ...prev,
            { role, text: transcript, timestamp: Date.now(), isPartial: true },
          ];
        });
      } else if (transcriptType === "final") {
        // Finalize: find the last partial entry for this role and replace it.
        // If no partial exists (e.g. very short utterance), just append.
        setConversation((prev) => {
          let lastPartialIdx = -1;
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].role === role && prev[i].isPartial) {
              lastPartialIdx = i;
              break;
            }
          }

          if (lastPartialIdx !== -1) {
            return [
              ...prev.slice(0, lastPartialIdx),
              {
                role,
                text: transcript,
                timestamp: prev[lastPartialIdx].timestamp,
                isPartial: false,
              },
              ...prev.slice(lastPartialIdx + 1),
            ];
          }

          // No partial found — append as a new finalized entry
          return [...prev, { role, text: transcript, timestamp: Date.now(), isPartial: false }];
        });

        // Track which question the assistant is currently asking
        if (role === "assistant") {
          const detected = detectQuestionIndex(transcript, questionsRef.current);
          if (detected !== null) {
            setActiveQuestionIndex(detected);
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
  }, []); // ← empty deps: register once, never re-run on prop changes
  //   All handlers read dynamic data via refs (questionsRef, mountedRef)

  /* ---- Actions ---- */

  const startCall = useCallback(async () => {
    // Guard: prevent double-start (React Strict Mode mounts twice in dev)
    if (callActiveRef.current) {
      console.warn("[Vapi] startCall ignored — a call is already active");
      return;
    }

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
      // Read latest values via refs so this callback stays stable (no deps)
      const currentConfig = configRef.current;
      const currentQuestions = questionsRef.current;

      console.log(
        `[Vapi] Starting call — ${currentQuestions.length} questions, role: ${currentConfig.role}`,
      );

      await vapi.start({
        firstMessage: `Hi there! I'm Alex, and I'll be your interviewer today. We have ${currentQuestions.length} questions prepared for a ${currentConfig.experienceLevel}-level ${currentConfig.role} ${currentConfig.type} interview. Let's begin! Question 1: ${currentQuestions[0]?.question ?? ""}`,
        // "transcript" is included in the SDK's default clientMessages, so no
        // override is needed here. Both partial and final transcript events will
        // be forwarded to this client's "message" event listener.
        model: {
          provider: "openai",
          model: "gpt-4o",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(currentConfig, currentQuestions),
            },
          ],
        },
        voice: {
          provider: "11labs",
          voiceId: "21m00Tcm4TlvDq8ikWAM", // "Rachel" — natural, professional voice
        },
      });
    } catch (err) {
      console.error("[Vapi] Failed to start call:", err);
      const message =
        err instanceof Error ? err.message : "Failed to start interview call.";
      setErrorMessage(message);
      setStatus("error");
      callActiveRef.current = false;
    }
  }, []); // stable — reads config/questions via refs, no deps needed

  const stopCall = useCallback(() => {
    if (!callActiveRef.current) {
      console.warn("[Vapi] stopCall ignored — no active call");
      return;
    }
    console.log("[Vapi] Stopping call — reason: user clicked End Interview");
    setStatus("ending");
    callActiveRef.current = false;
    try {
      const vapi = getVapiClient();
      vapi.stop();
    } catch (err) {
      console.error("[Vapi] Failed to stop call:", err);
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
