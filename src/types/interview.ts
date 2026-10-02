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

export type Interview = {
  id: string;
  title: string;
  role: InterviewRole;
  type: InterviewType;
  date: string;
  status: InterviewStatus;
  description: string;
};
