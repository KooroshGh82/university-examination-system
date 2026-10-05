# Multiple-choice examination workflow

This module extends the authentication, course and exam backend. It uses the existing `ExamAttempt`, `AttemptQuestion`, `StudentAnswer`, `Grade` and `AuditEvent` Prisma models; **no schema migration**. It does not implement descriptive uploads, manual descriptive grading or grade objections.

## Endpoints

| Method | URL                                               | Role               | Body / response                                                                                                         |
| ------ | ------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| GET    | `/exams?courseId=&type=MULTIPLE_CHOICE`           | Student            | Previously implemented exam listing; only published exams in actively enrolled courses                                  |
| POST   | `/exams/:examId/attempts`                         | Student            | Start or resume own attempt; returns attempt and shuffled questions/options, with no `isCorrect`. 201 new, 200 resume   |
| GET    | `/attempts?examId=&status=&limit=&cursor=`        | Student, Professor | Student own submissions; professor only attempts of their active assigned exams, including draft scores                 |
| GET    | `/attempts/:attemptId`                            | Student, Professor | Student sees own questions/selections without answer key/score; assigned professor sees selections, key and draft score |
| PUT    | `/attempts/:attemptId/answers/:attemptQuestionId` | Student            | `{ "optionId": "UUID" }` save choice, `{ "optionId": null }` clear choice; latest choice replaces prior choice          |
| POST   | `/attempts/:attemptId/submit`                     | Student            | No body; freezes answers, scores on server, stores `SUBMITTED` and draft Grade; repeat returns same receipt             |
| GET    | `/attempts/:attemptId/grade`                      | Student, Professor | Professor sees draft/published Grade; student receives 404 until individual publication                                 |
| POST   | `/grades/:gradeId/publish`                        | Professor          | No body; active assigned professor publishes this student's Grade once, returns published score                         |

All routes require JWT authentication and UUID validation. Roles are checked before access; resource ownership and active enrollment/assignment are checked against the database. Another user's attempt yields 404. No client score field is accepted. Question/options are taken from immutable published exam content and the attempt's saved shuffle, with no correct flag in the student projection. Decimal points are summed using Prisma.Decimal. An unanswered question contributes zero.

## Deadline and concurrency

Attempt start checks published MCQ, active enrollment, exam window `[startsAt,endsAt)` using PostgreSQL `clock_timestamp()`, and the unique `(examId,studentId)` constraint. The exam and enrollment are locked during creation. `deadlineAt=min(exam.endsAt,startedAt+durationMinutes)` (or `endsAt` without a duration). Selection and submission lock the attempt row, compare against database time, and reject writes at/after deadline. The worker also finalizes due MCQs every five seconds. A late write or submit can finalize saved answers as `AUTO_SUBMITTED` inside its transaction before returning `409 DEADLINE_PASSED`. The effective `submittedAt` for auto submission is `deadlineAt`; a late worker never extends the allowed time. A repeat final submit returns its existing receipt and never recalculates the grade. The attempt and Grade are saved in one transaction.

Grade publication is per student. `Grade.status` remains `DRAFT` after automatic scoring, and student grade lookup returns 404 until an active assigned professor publishes it. Publication sets `publishedAt` once; repeated publish returns the existing Grade.

## Example

```bash
curl -X POST -H 'Authorization: Bearer STUDENT_TOKEN' \
  http://localhost:3000/api/v1/exams/EXAM_UUID/attempts

curl -X PUT -H 'Authorization: Bearer STUDENT_TOKEN' -H 'Content-Type: application/json' \
  -d '{"optionId":"OPTION_UUID"}' \
  http://localhost:3000/api/v1/attempts/ATTEMPT_UUID/answers/ATTEMPT_QUESTION_UUID

curl -X POST -H 'Authorization: Bearer STUDENT_TOKEN' \
  http://localhost:3000/api/v1/attempts/ATTEMPT_UUID/submit

curl -H 'Authorization: Bearer PROFESSOR_TOKEN' \
  'http://localhost:3000/api/v1/attempts?examId=EXAM_UUID'

curl -X POST -H 'Authorization: Bearer PROFESSOR_TOKEN' \
  http://localhost:3000/api/v1/grades/GRADE_UUID/publish
```

The background worker starts with the application process. If deploying several replicas, its transactions and row locks make repeated cutoff attempts harmless, though a dedicated worker process is recommended for operational monitoring. This module was type checked, built and Prisma validated; run integration tests against PostgreSQL for concurrent saves, submit versus cutoff, duplicate start and score correctness before deployment.
