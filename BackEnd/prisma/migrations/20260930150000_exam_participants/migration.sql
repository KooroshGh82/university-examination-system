CREATE TABLE "exam_participants" (
 "exam_id" UUID NOT NULL,
 "student_id" UUID NOT NULL,
 CONSTRAINT "exam_participants_pkey" PRIMARY KEY ("exam_id", "student_id"),
 CONSTRAINT "exam_participants_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "exam_participants_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "exam_participants_student_id_idx" ON "exam_participants"("student_id");
-- Preserve existing participation for exams already linked through courses.
INSERT INTO "exam_participants" ("exam_id", "student_id")
SELECT e.id, n.student_id FROM exams e JOIN enrollments n ON n.course_id = e.course_id WHERE n.is_active = true
ON CONFLICT DO NOTHING;
