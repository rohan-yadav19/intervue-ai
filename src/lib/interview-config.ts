import type {
  ExperienceLevel,
  InterviewConfig,
  InterviewType,
  QuestionCount,
} from "@/types";

export type InterviewConfigInput = {
  role: string;
  experienceLevel: string;
  type: string;
  techStack: string;
  questionCount: string;
};

export type InterviewConfigErrors = Partial<
  Record<keyof InterviewConfigInput, string>
>;

const EXPERIENCE_LEVELS = new Set<ExperienceLevel>(["entry", "mid", "senior"]);
const INTERVIEW_TYPES = new Set<InterviewType>([
  "technical",
  "behavioral",
  "system-design",
  "mixed",
]);
const QUESTION_COUNTS = new Set<QuestionCount>([5, 10, 15]);

export const EMPTY_INTERVIEW_CONFIG: InterviewConfigInput = {
  role: "",
  experienceLevel: "",
  type: "",
  techStack: "",
  questionCount: "",
};

export function validateInterviewConfig(
  values: InterviewConfigInput,
): InterviewConfigErrors {
  const errors: InterviewConfigErrors = {};

  if (!values.role.trim()) {
    errors.role = "Job role is required.";
  }

  if (!EXPERIENCE_LEVELS.has(values.experienceLevel as ExperienceLevel)) {
    errors.experienceLevel = "Select an experience level.";
  }

  if (!INTERVIEW_TYPES.has(values.type as InterviewType)) {
    errors.type = "Select an interview type.";
  }

  if (!values.techStack.trim()) {
    errors.techStack = "Tech stack is required.";
  }

  const questionCount = Number(values.questionCount);
  if (!QUESTION_COUNTS.has(questionCount as QuestionCount)) {
    errors.questionCount = "Select the number of questions.";
  }

  return errors;
}

export function toInterviewConfig(
  values: InterviewConfigInput,
): InterviewConfig {
  return {
    role: values.role.trim(),
    experienceLevel: values.experienceLevel as ExperienceLevel,
    type: values.type as InterviewType,
    techStack: values.techStack.trim(),
    questionCount: Number(values.questionCount) as QuestionCount,
  };
}
