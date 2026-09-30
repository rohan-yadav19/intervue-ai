export type InterviewStatus = "draft" | "scheduled" | "in_progress" | "completed";

export type InterviewRole = "frontend" | "backend" | "fullstack" | "general";

export type InterviewType = "technical" | "behavioral" | "system-design" | "mixed";

export type Interview = {
  id: string;
  title: string;
  role: InterviewRole;
  type: InterviewType;
  date: string;
  status: InterviewStatus;
  description: string;
};
