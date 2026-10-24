export type InterviewStatus = "draft" | "scheduled" | "in_progress" | "completed";

export type InterviewRole = "frontend" | "backend" | "fullstack" | "general";

export type InterviewType = "technical" | "behavioral" | "system-design" | "mixed";

export type ExperienceLevel = "entry" | "mid" | "senior";

export type QuestionCount = 5 | 10 | 15;

export type InterviewConfig = {
  role: string;
  experienceLevel: ExperienceLevel;
  type: InterviewType;
  techStack: string;
  questionCount: QuestionCount;
};

export type GeneratedQuestion = {
  question: string;
  topic: string;
};

export type GenerateQuestionsResponse = {
  interviewConfig: InterviewConfig;
  questions: GeneratedQuestion[];
};

export type Interview = {
  id: string;
  title: string;
  role: InterviewRole;
  type: InterviewType;
  date: string;
  status: InterviewStatus;
  description: string;
};

/* ------------------------------------------------------------------ */
/*  Completed interview session (stored in Firestore)                  */
/* ------------------------------------------------------------------ */

export type InterviewSessionStatus = "completed" | "abandoned";

/* ------------------------------------------------------------------ */
/*  AI-generated feedback                                              */
/* ------------------------------------------------------------------ */

export type QuestionEvaluation = {
  /** The original question text */
  question: string;
  /** The candidate's answer from the transcript (empty string if not answered) */
  answer: string;
  /** 1–10 score for this answer */
  score: number;
  /** Short evaluation of what was good */
  strength: string;
  /** Short evaluation of what could be improved */
  improvement: string;
};

export type InterviewFeedback = {
  /** Firestore document ID (set after creation) */
  id?: string;
  /** ID of the parent InterviewSession document */
  sessionId: string;
  /** Firebase Auth UID — for security rules */
  userId: string;
  /** Overall score out of 10 */
  overallScore: number;
  /** 2–4 high-level strength areas */
  strengths: string[];
  /** 2–4 high-level areas to work on */
  weaknesses: string[];
  /** Per-question evaluations, in question order */
  questionEvaluations: QuestionEvaluation[];
  /** 3–5 concrete improvement suggestions */
  suggestions: string[];
  /** ISO-8601 timestamp when feedback was generated */
  generatedAt: string;
};

export type SessionConversationEntry = {
  role: "assistant" | "user";
  text: string;
  timestamp: number;
};

export type InterviewSession = {
  /** Firestore document ID (set after creation) */
  id?: string;
  /** Firebase Auth UID */
  userId: string;
  /** Free-text job role from the config form */
  jobRole: string;
  /** Experience level chosen by the user */
  experienceLevel: ExperienceLevel;
  /** Type of interview */
  interviewType: InterviewType;
  /** Comma-separated tech stack */
  techStack: string;
  /** The generated interview questions */
  questions: GeneratedQuestion[];
  /** Full conversation transcript between user & AI */
  transcript: SessionConversationEntry[];
  /** ISO-8601 timestamp when the session was saved */
  completedAt: string;
  /** Whether the user completed the full interview or ended early */
  status: InterviewSessionStatus;
};
