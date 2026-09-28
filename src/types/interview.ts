export type InterviewStatus = "draft" | "scheduled" | "in_progress" | "completed";

export type InterviewRole = "frontend" | "backend" | "fullstack" | "general";

export type Interview = {
  id: string;
  title: string;
  role: InterviewRole;
  status: InterviewStatus;
  description: string;
};
