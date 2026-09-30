import type { Interview } from "@/types";

export const APP_NAME = "IntervueAI";

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  interviews: "/interview",
  interview: (id: string) => `/interview/${id}`,
  signIn: "/sign-in",
  signUp: "/sign-up",
} as const;

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

export const START_INTERVIEW_HREF = ROUTES.interview(MOCK_INTERVIEWS[0].id);
