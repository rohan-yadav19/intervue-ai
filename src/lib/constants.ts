import type { Interview } from "@/types";

export const APP_NAME = "IntervueAI";

export const ROUTES = {
  home: "/",
  interviews: "/interview",
  interview: (id: string) => `/interview/${id}`,
} as const;

export const MOCK_INTERVIEWS: Interview[] = [
  {
    id: "frontend-basics",
    title: "Frontend Basics",
    role: "frontend",
    status: "draft",
    description: "HTML, CSS, JavaScript, and React fundamentals.",
  },
  {
    id: "system-design",
    title: "System Design",
    role: "fullstack",
    status: "draft",
    description: "High-level architecture and trade-off discussion.",
  },
];

export const START_INTERVIEW_HREF = ROUTES.interview(MOCK_INTERVIEWS[0].id);
