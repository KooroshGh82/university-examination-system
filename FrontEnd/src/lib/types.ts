export type User = {
  id: string;
  universityId: string;
  fullName: string;
  email?: string | null;
  role: "STUDENT" | "PROFESSOR" | "ADMIN";
  isActive: boolean;
  mustChangePassword: boolean;
};
export type Course = {
  id: string;
  code: string;
  titleFa: string;
  termCode: string;
};
export type Exam = {
  id: string;
  courseId: string;
  titleFa: string;
  instructionsFa?: string | null;
  type: "MULTIPLE_CHOICE" | "DESCRIPTIVE";
  status: string;
  startsAt: string;
  endsAt: string;
  durationMinutes?: number | null;
  maxPoints: string;
};
export type Question = {
  attemptQuestionId: string;
  questionId: string;
  position: number;
  promptFa: string;
  points: string;
  options: { id: string; position: number; textFa: string }[];
  selectedOptionId?: string | null;
};
export type Attempt = {
  id: string;
  examId: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED" | "ABSENT";
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string | null;
  questions?: Question[];
};
export type Grade = {
  id: string;
  attemptId: string;
  score: string;
  status: "PUBLISHED";
  publishedAt: string;
};
export type Objection = {
  student?: { fullName: string; universityId: string };
  id: string;
  gradeId: string;
  round: number;
  reasonFa: string;
  status: string;
  submittedAt: string;
  decision?: { responseFa: string; decidedAt: string; revisionId?: string };
};
export type ExamDetail = Exam & {
  publishedAt?: string | null;
  questionFiles?: StoredFile[];
};
export type EditorOption = {
  id: string;
  questionId: string;
  textFa: string;
  position: number;
  isCorrect: boolean;
};
export type EditorQuestion = {
  id: string;
  examId: string;
  promptFa: string;
  points: string;
  authorOrder: number;
  options: EditorOption[];
};
export type ProfessorAttempt = Attempt & {
  studentId?: string;
  student?: { fullName: string; universityId: string };
  files?: StoredFile[];
};
export type ProfessorGrade = Omit<Grade, "status"> & {
  status: "DRAFT" | "PUBLISHED";
};
export type StoredFile = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  purgedAt?: string | null;
};
export type Page<T> = { items: T[]; nextCursor?: string | null };
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; issue: string }[],
  ) {
    super(message);
  }
}
