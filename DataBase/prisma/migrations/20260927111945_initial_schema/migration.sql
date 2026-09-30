-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STUDENT', 'PROFESSOR');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('MULTIPLE_CHOICE', 'DESCRIPTIVE');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'ABSENT');

-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ObjectionStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CONFIRMED', 'CHANGED');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('EXAM_QUESTION', 'STUDENT_ANSWER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "university_id" VARCHAR(64) NOT NULL,
    "email" VARCHAR(320),
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "user_id" UUID NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "professors" (
    "user_id" UUID NOT NULL,

    CONSTRAINT "professors_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "title_fa" VARCHAR(200) NOT NULL,
    "term_code" VARCHAR(32) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professor_assignments" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "professor_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "professor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "professor_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "created_by_admin_id" UUID,
    "title_fa" VARCHAR(200) NOT NULL,
    "instructions_fa" TEXT,
    "type" "ExamType" NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "ends_at" TIMESTAMPTZ(6) NOT NULL,
    "duration_minutes" INTEGER,
    "max_points" DECIMAL(8,2) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "prompt_fa" TEXT NOT NULL,
    "points" DECIMAL(8,2) NOT NULL,
    "author_order" INTEGER NOT NULL,

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "multiple_choice_options" (
    "id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "text_fa" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "multiple_choice_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_at" TIMESTAMPTZ(6) NOT NULL,
    "submitted_at" TIMESTAMPTZ(6),

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_questions" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "attempt_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_answers" (
    "id" UUID NOT NULL,
    "attempt_question_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "kind" "FileKind" NOT NULL,
    "exam_id" UUID,
    "attempt_id" UUID,
    "original_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT,
    "sha256" VARCHAR(64) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purge_after" TIMESTAMPTZ(6),
    "purged_at" TIMESTAMPTZ(6),

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "score" DECIMAL(8,2) NOT NULL,
    "status" "GradeStatus" NOT NULL DEFAULT 'DRAFT',
    "graded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_revisions" (
    "id" UUID NOT NULL,
    "grade_id" UUID NOT NULL,
    "professor_id" UUID NOT NULL,
    "old_score" DECIMAL(8,2) NOT NULL,
    "new_score" DECIMAL(8,2) NOT NULL,
    "reason_fa" TEXT NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_objections" (
    "id" UUID NOT NULL,
    "grade_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "reason_fa" TEXT NOT NULL,
    "status" "ObjectionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_objections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objection_decisions" (
    "id" UUID NOT NULL,
    "objection_id" UUID NOT NULL,
    "professor_id" UUID NOT NULL,
    "response_fa" TEXT NOT NULL,
    "decided_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revision_id" UUID,

    CONSTRAINT "objection_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" UUID NOT NULL,
    "details" JSONB,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_university_id_key" ON "users"("university_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_term_code_key" ON "courses"("code", "term_code");

-- CreateIndex
CREATE INDEX "enrollments_student_id_is_active_idx" ON "enrollments"("student_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_course_id_student_id_key" ON "enrollments"("course_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_id_course_id_student_id_key" ON "enrollments"("id", "course_id", "student_id");

-- CreateIndex
CREATE INDEX "professor_assignments_professor_id_is_active_idx" ON "professor_assignments"("professor_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "professor_assignments_course_id_professor_id_key" ON "professor_assignments"("course_id", "professor_id");

-- CreateIndex
CREATE UNIQUE INDEX "professor_assignments_id_course_id_professor_id_key" ON "professor_assignments"("id", "course_id", "professor_id");

-- CreateIndex
CREATE INDEX "exams_course_id_starts_at_idx" ON "exams"("course_id", "starts_at");

-- CreateIndex
CREATE INDEX "exams_professor_id_status_idx" ON "exams"("professor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "exams_id_course_id_key" ON "exams"("id", "course_id");

-- CreateIndex
CREATE INDEX "exam_questions_exam_id_idx" ON "exam_questions"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_exam_id_author_order_key" ON "exam_questions"("exam_id", "author_order");

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_id_exam_id_key" ON "exam_questions"("id", "exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "multiple_choice_options_question_id_position_key" ON "multiple_choice_options"("question_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "multiple_choice_options_id_question_id_key" ON "multiple_choice_options"("id", "question_id");

-- CreateIndex
CREATE INDEX "exam_attempts_student_id_started_at_idx" ON "exam_attempts"("student_id", "started_at");

-- CreateIndex
CREATE INDEX "exam_attempts_exam_id_status_idx" ON "exam_attempts"("exam_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_exam_id_student_id_key" ON "exam_attempts"("exam_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_id_exam_id_key" ON "exam_attempts"("id", "exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_questions_attempt_id_question_id_key" ON "attempt_questions"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_questions_attempt_id_position_key" ON "attempt_questions"("attempt_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_questions_id_question_id_key" ON "attempt_questions"("id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_answers_attempt_question_id_key" ON "student_answers"("attempt_question_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_answers_attempt_question_id_question_id_key" ON "student_answers"("attempt_question_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");

-- CreateIndex
CREATE INDEX "stored_files_attempt_id_idx" ON "stored_files"("attempt_id");

-- CreateIndex
CREATE INDEX "stored_files_purge_after_purged_at_idx" ON "stored_files"("purge_after", "purged_at");

-- CreateIndex
CREATE UNIQUE INDEX "grades_attempt_id_key" ON "grades"("attempt_id");

-- CreateIndex
CREATE INDEX "grades_status_published_at_idx" ON "grades"("status", "published_at");

-- CreateIndex
CREATE INDEX "grade_revisions_grade_id_changed_at_idx" ON "grade_revisions"("grade_id", "changed_at");

-- CreateIndex
CREATE INDEX "grade_objections_student_id_submitted_at_idx" ON "grade_objections"("student_id", "submitted_at");

-- CreateIndex
CREATE INDEX "grade_objections_grade_id_status_idx" ON "grade_objections"("grade_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "grade_objections_grade_id_round_key" ON "grade_objections"("grade_id", "round");

-- CreateIndex
CREATE UNIQUE INDEX "objection_decisions_objection_id_key" ON "objection_decisions"("objection_id");

-- CreateIndex
CREATE UNIQUE INDEX "objection_decisions_revision_id_key" ON "objection_decisions"("revision_id");

-- CreateIndex
CREATE INDEX "objection_decisions_professor_id_decided_at_idx" ON "objection_decisions"("professor_id", "decided_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_occurred_at_idx" ON "audit_events"("entity_type", "entity_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_events_actor_id_occurred_at_idx" ON "audit_events"("actor_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professors" ADD CONSTRAINT "professors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_assignments" ADD CONSTRAINT "professor_assignments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professor_assignments" ADD CONSTRAINT "professor_assignments_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professors"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professors"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_assignment_id_course_id_professor_id_fkey" FOREIGN KEY ("assignment_id", "course_id", "professor_id") REFERENCES "professor_assignments"("id", "course_id", "professor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "multiple_choice_options" ADD CONSTRAINT "multiple_choice_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_course_id_fkey" FOREIGN KEY ("exam_id", "course_id") REFERENCES "exams"("id", "course_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_enrollment_id_course_id_student_id_fkey" FOREIGN KEY ("enrollment_id", "course_id", "student_id") REFERENCES "enrollments"("id", "course_id", "student_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_questions" ADD CONSTRAINT "attempt_questions_attempt_id_exam_id_fkey" FOREIGN KEY ("attempt_id", "exam_id") REFERENCES "exam_attempts"("id", "exam_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_questions" ADD CONSTRAINT "attempt_questions_question_id_exam_id_fkey" FOREIGN KEY ("question_id", "exam_id") REFERENCES "exam_questions"("id", "exam_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_attempt_question_id_question_id_fkey" FOREIGN KEY ("attempt_question_id", "question_id") REFERENCES "attempt_questions"("id", "question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_answers" ADD CONSTRAINT "student_answers_option_id_question_id_fkey" FOREIGN KEY ("option_id", "question_id") REFERENCES "multiple_choice_options"("id", "question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grades" ADD CONSTRAINT "grades_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_revisions" ADD CONSTRAINT "grade_revisions_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_revisions" ADD CONSTRAINT "grade_revisions_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professors"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_objections" ADD CONSTRAINT "grade_objections_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "grades"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_objections" ADD CONSTRAINT "grade_objections_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection_decisions" ADD CONSTRAINT "objection_decisions_objection_id_fkey" FOREIGN KEY ("objection_id") REFERENCES "grade_objections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection_decisions" ADD CONSTRAINT "objection_decisions_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "professors"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objection_decisions" ADD CONSTRAINT "objection_decisions_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "grade_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
