import {
  ApiError,
  type Page,
  type User,
  type Course,
  type Exam,
  type ExamDetail,
  type Attempt,
  type Grade,
  type Objection,
  type StoredFile,
  type EditorQuestion,
  type EditorOption,
  type ProfessorGrade,
  type ProfessorAttempt,
} from "./types";
const root = "/api/backend";
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(root + path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let e: {
      error?: {
        code?: string;
        message?: string;
        details?: { field: string; issue: string }[];
      };
    } = {};
    try {
      e = await response.json();
    } catch {}
    if (
      e.error?.code === "PASSWORD_CHANGE_REQUIRED" &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/change-password"
    )
      window.location.replace("/change-password");
    throw new ApiError(
      response.status,
      e.error?.code || "HTTP_ERROR",
      e.error?.message || "درخواست انجام نشد.",
      e.error?.details,
    );
  }
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  return body.data as T;
}
const q = (v: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(v).forEach(([k, x]) => {
    if (x !== undefined) s.set(k, String(x));
  });
  return s.toString() ? "?" + s : "";
};
export async function allPages<T>(path: string): Promise<T[]> {
  let cursor: string | undefined;
  const items: T[] = [];
  do {
    const p = await request<Page<T>>(path + q({ limit: 100, cursor }));
    items.push(...p.items);
    cursor = p.nextCursor || undefined;
  } while (cursor);
  return items;
}
export const api = {
  login: (universityId: string, password: string) =>
    request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ universityId, password }),
    }),
  createUser: (
    role: "STUDENT" | "PROFESSOR",
    fullName: string,
    universityId: string,
  ) =>
    request<User>(role === "STUDENT" ? "/students" : "/professors", {
      method: "POST",
      body: JSON.stringify({ fullName, universityId }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  courses: () =>
    allPages<{ course: Course; enrollmentId: string; isActive: boolean }>(
      "/students/me/courses",
    ),
  exams: () => allPages<Exam>("/exams"),
  exam: (id: string) => request<Exam>(`/exams/${encodeURIComponent(id)}`),
  attempts: () => allPages<Attempt>("/attempts"),
  attempt: (id: string) =>
    request<Attempt>(`/attempts/${encodeURIComponent(id)}`),
  start: (examId: string) =>
    request<Attempt>(`/exams/${encodeURIComponent(examId)}/attempts`, {
      method: "POST",
    }),
  answer: (attemptId: string, questionId: string, optionId: string | null) =>
    request<{ savedAt: string }>(
      `/attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`,
      { method: "PUT", body: JSON.stringify({ optionId }) },
    ),
  submit: (id: string) =>
    request<Attempt>(`/attempts/${encodeURIComponent(id)}/submit`, {
      method: "POST",
    }),
  files: (id: string) =>
    request<{ items: StoredFile[] }>(
      `/attempts/${encodeURIComponent(id)}/files`,
    ),
  questionFiles: (id: string) =>
    request<{ items: StoredFile[] }>(
      `/exams/${encodeURIComponent(id)}/question-files`,
    ),
  removeFile: (id: string, fileId: string) =>
    request<void>(
      `/attempts/${encodeURIComponent(id)}/files/${encodeURIComponent(fileId)}`,
      { method: "DELETE" },
    ),
  grades: () => allPages<Grade>("/grades"),
  grade: (attemptId: string) =>
    request<Grade>(`/attempts/${encodeURIComponent(attemptId)}/grade`),
  objections: (gradeId: string) =>
    allPages<Objection>(`/grades/${encodeURIComponent(gradeId)}/objections`),
  objection: (id: string) =>
    request<Objection>(`/objections/${encodeURIComponent(id)}`),
  createObjection: (gradeId: string, reasonFa: string) =>
    request<Objection>(`/grades/${encodeURIComponent(gradeId)}/objections`, {
      method: "POST",
      body: JSON.stringify({ reasonFa }),
    }),
};
const id = (s: string) => encodeURIComponent(s);
const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
export const professorApi = {
  createCourse: (body: { code: string; titleFa: string; termCode: string }) =>
    request<Course>("/courses", json("POST", body)),
  courses: () =>
    allPages<{ course: Course; assignmentId: string; isActive: boolean }>(
      "/professors/me/courses",
    ),
  exams: () => allPages<Exam>("/exams"),
  exam: (examId: string) => request<ExamDetail>(`/exams/${id(examId)}`),
  createExam: (body: {
    courseId: string;
    titleFa: string;
    instructionsFa?: string;
    type: Exam["type"];
    startsAt: string;
    endsAt: string;
    durationMinutes?: number;
    maxPoints: string;
  }) => request<ExamDetail>("/exams", json("POST", body)),
  updateExam: (
    examId: string,
    body: Partial<
      Pick<
        Exam,
        | "titleFa"
        | "instructionsFa"
        | "startsAt"
        | "endsAt"
        | "durationMinutes"
        | "maxPoints"
      >
    >,
  ) => request<ExamDetail>(`/exams/${id(examId)}`, json("PATCH", body)),
  publishExam: (examId: string) =>
    request<ExamDetail>(`/exams/${id(examId)}/publish`, json("POST")),
  cancelExam: (examId: string) =>
    request<ExamDetail>(`/exams/${id(examId)}/cancel`, json("POST")),
  questions: (examId: string) =>
    request<{ items: EditorQuestion[] }>(`/exams/${id(examId)}/questions`),
  addQuestion: (
    examId: string,
    body: { promptFa: string; points: string; authorOrder: number },
  ) =>
    request<EditorQuestion>(
      `/exams/${id(examId)}/questions`,
      json("POST", body),
    ),
  editQuestion: (
    examId: string,
    questionId: string,
    body: Partial<{ promptFa: string; points: string; authorOrder: number }>,
  ) =>
    request<EditorQuestion>(
      `/exams/${id(examId)}/questions/${id(questionId)}`,
      json("PATCH", body),
    ),
  deleteQuestion: (examId: string, questionId: string) =>
    request<void>(
      `/exams/${id(examId)}/questions/${id(questionId)}`,
      json("DELETE"),
    ),
  addOption: (
    examId: string,
    questionId: string,
    body: { textFa: string; position: number; isCorrect: boolean },
  ) =>
    request<EditorOption>(
      `/exams/${id(examId)}/questions/${id(questionId)}/options`,
      json("POST", body),
    ),
  editOption: (
    examId: string,
    questionId: string,
    optionId: string,
    body: Partial<{ textFa: string; position: number; isCorrect: boolean }>,
  ) =>
    request<EditorOption>(
      `/exams/${id(examId)}/questions/${id(questionId)}/options/${id(optionId)}`,
      json("PATCH", body),
    ),
  deleteOption: (examId: string, questionId: string, optionId: string) =>
    request<void>(
      `/exams/${id(examId)}/questions/${id(questionId)}/options/${id(optionId)}`,
      json("DELETE"),
    ),
  attempts: () => allPages<ProfessorAttempt>("/attempts"),
  attempt: (attemptId: string) =>
    request<ProfessorAttempt>(`/attempts/${id(attemptId)}`),
  files: (attemptId: string) =>
    request<{ items: StoredFile[] }>(`/attempts/${id(attemptId)}/files`),
  questionFiles: (examId: string) =>
    request<{ items: StoredFile[] }>(`/exams/${id(examId)}/question-files`),
  grade: (attemptId: string) =>
    request<ProfessorGrade>(`/attempts/${id(attemptId)}/grade`),
  grades: () => allPages<ProfessorGrade>("/grades"),
  saveGrade: (attemptId: string, score: string) =>
    request<ProfessorGrade>(
      `/attempts/${id(attemptId)}/grade`,
      json("PUT", { score }),
    ),
  publishGrade: (gradeId: string) =>
    request<ProfessorGrade>(`/grades/${id(gradeId)}/publish`, json("POST")),
  objections: () => allPages<Objection>("/objections"),
  objection: (objectionId: string) =>
    request<Objection>(`/objections/${id(objectionId)}`),
  reviewObjection: (objectionId: string) =>
    request<Objection>(`/objections/${id(objectionId)}/review`, json("POST")),
  decideObjection: (
    objectionId: string,
    body: { responseFa: string; newScore?: string },
  ) =>
    request<Objection>(
      `/objections/${id(objectionId)}/decision`,
      json("POST", body),
    ),
};
export async function downloadFile(id: string, name: string) {
  const r = await fetch(`${root}/files/${encodeURIComponent(id)}/download`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!r.ok)
    throw new ApiError(r.status, "DOWNLOAD_FAILED", "دریافت فایل انجام نشد.");
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export function uploadFile(
  attemptId: string,
  file: File,
  onProgress: (p: number) => void,
): Promise<StoredFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${root}/attempts/${encodeURIComponent(attemptId)}/files`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((100 * e.loaded) / e.total));
    };
    xhr.onload = () => {
      let b;
      try {
        b = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(b?.data);
      else
        reject(
          new ApiError(
            xhr.status,
            b?.error?.code || "UPLOAD_FAILED",
            b?.error?.message || "بارگذاری فایل انجام نشد.",
          ),
        );
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "NETWORK", "ارتباط با سرور برقرار نشد."));
    const data = new FormData();
    data.append("file", file);
    xhr.send(data);
  });
}
export function uploadQuestionFile(
  examId: string,
  file: File,
  onProgress: (p: number) => void,
): Promise<StoredFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${root}/exams/${id(examId)}/question-files`);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((100 * e.loaded) / e.total));
    };
    xhr.onload = () => {
      let b;
      try {
        b = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(b?.data);
      else
        reject(
          new ApiError(
            xhr.status,
            b?.error?.code || "UPLOAD_FAILED",
            b?.error?.message || "بارگذاری فایل انجام نشد.",
          ),
        );
    };
    xhr.onerror = () =>
      reject(new ApiError(0, "NETWORK", "ارتباط با سرور برقرار نشد."));
    const data = new FormData();
    data.append("file", file);
    xhr.send(data);
  });
}

export type AdminExam = {
  id: string;
  titleFa: string;
  status: string;
  course: Course;
  professor: User;
  participantCount: number;
};
export const adminApi = {
  students: () => request<User[]>("/admin/students"),
  exams: () => request<AdminExam[]>("/admin/exams"),
  participants: (examId: string) =>
    request<User[]>(`/admin/exams/${id(examId)}/students`),
  assign: (examId: string, studentIds: string[]) =>
    request<void>(
      `/admin/exams/${id(examId)}/students`,
      json("POST", { studentIds }),
    ),
  remove: (examId: string, studentId: string) =>
    request<void>(
      `/admin/exams/${id(examId)}/students/${id(studentId)}`,
      json("DELETE"),
    ),
};
