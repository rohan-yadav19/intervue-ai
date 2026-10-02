import type { Interview } from "@/types";

export const APP_NAME = "IntervueAI";

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  interviews: "/interview",
  interview: (id: string) => `/interview/${id}`,
  createInterview: "/interview/create",
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const;

export const EXPERIENCE_LEVEL_OPTIONS = [
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
] as const;

export const INTERVIEW_TYPE_OPTIONS = [
  { value: "technical", label: "Technical" },
  { value: "behavioral", label: "Behavioral" },
  { value: "system-design", label: "System Design" },
  { value: "mixed", label: "Mixed" },
] as const;

export const QUESTION_COUNT_OPTIONS = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 15, label: "15" },
] as const;

export const MOCK_INTERVIEWS: Interview[] = [
  {
    id: "frontend-basics",
    title: "Frontend Basics",
    role: "frontend",
    type: "technical",
    date: "2026-09-12",
    status: "completed",
    description: "HTML, CSS, JavaScript, and React fundamentals.",
  },
  {
    id: "system-design",
    title: "System Design",
    role: "fullstack",
    type: "system-design",
    date: "2026-09-18",
    status: "scheduled",
    description: "High-level architecture and trade-off discussion.",
  },
  {
    id: "behavioral-round",
    title: "Behavioral Round",
    role: "general",
    type: "behavioral",
    date: "2026-09-24",
    status: "in_progress",
    description: "Leadership, communication, and past-project walkthroughs.",
  },
];

export const START_INTERVIEW_HREF = ROUTES.createInterview;
