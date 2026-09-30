# Grades, performance and objections

This module extends the existing authentication, course, exam, MCQ and descriptive backend. It uses the existing `Grade`, `GradeRevision`, `GradeObjection`, `ObjectionDecision` and `AuditEvent` tables. **No new database migration is required.** Apply the earlier `Grade.commentsFa` migration if your project has not already done so. No frontend code is included.

## Roles, visibility and statuses

`Grade.status` is `DRAFT` or `PUBLISHED`. Automatic MCQ scoring and descriptive professor grading produce a draft grade; an active professor assigned to the exam publishes each student's grade individually. Students can read **only their own published** grades, comments and revision history. Assigned professors can read draft and published grades. Historical student grades remain visible when enrollment becomes inactive; inactive professor assignments do not grant review or publication access.

`GradeObjection.status` is `SUBMITTED → UNDER_REVIEW → CONFIRMED` (score unchanged) or `SUBMITTED → UNDER_REVIEW → CHANGED` (score revised). Decision is the closing action; terminal objections cannot be reopened. Every decision stores a nonblank `ObjectionDecision.responseFa`; a changed score creates exactly one append-only `GradeRevision` in the same transaction and leaves the original `Grade.publishedAt` unchanged. All important transitions append `AuditEvent` without copying objection text into audit details.

## Grade endpoints

| Method | URL | Role | Result |
| --- | --- | --- | --- |
| GET | `/grades?courseId=&examId=&status=&limit=&cursor=` | Student, Professor | Student own published grades; professor assigned draft/published grades |
| GET | `/courses/:courseId/grades?limit=&cursor=` | Student, Professor | Same scope, filtered by course |
| GET | `/exams/:examId/grades?limit=&cursor=` | Student, Professor | Same scope, filtered by exam |
| GET | `/grades/:gradeId` | Student, Professor | Scoped grade, score, comments, status |
| GET | `/grades/:gradeId/revisions?limit=&cursor=` | Student, Professor | Append-only old/new scores, reason, professor and timestamp |
| POST | `/grades/:gradeId/publish` | Assigned professor | Individual grade publication; repeated call returns the same published grade |
| GET | `/attempts/:attemptId/grade` | Student, Professor | Existing route; student receives 404 before publication |
| GET | `/grades/performance?courseId=` | Student | Own published grade totals, averages and chronological exam trends |
| GET | `/courses/:courseId/grade-comparison` | Student | Own published exams in the course, normalized percentages and change from preceding exam |

List responses use `{data:{items:[...],nextCursor?}}`, `limit` 1–100 (default 20). A student probing another user's grade or objection gets 404. Score and max points are decimal strings. There is no GPA or course-credit weighting in the approved schema. Performance uses only published grades: `totalScore = sum(score)`, `totalMaxPoints = sum(exam.maxPoints)`, `averagePercentage = arithmetic mean(score/maxPoints×100)` and `weightedPercentage = totalScore/totalMaxPoints×100`. Empty grade sets return zero count, totals `"0"`, and null percentages. Trend order is exam `startsAt`, then exam ID; `deltaFromPreviousPercentagePoints` is null for the first exam and a signed decimal string thereafter. A changed grade is reflected in the latest summary while revision history preserves earlier scores.

## Objection endpoints

| Method | URL | Role | Request / result |
| --- | --- | --- | --- |
| POST | `/grades/:gradeId/objections` | Student | `{reasonFa}`; creates next round, 201 |
| GET | `/grades/:gradeId/objections?limit=&cursor=` | Student, Professor | Own grade or active assigned exam history |
| GET | `/objections?gradeId=&examId=&status=&limit=&cursor=` | Student, Professor | Own objections or active assigned objections |
| GET | `/objections/:objectionId` | Student, Professor | Status and professor response/decision when available |
| POST | `/objections/:objectionId/review` | Assigned professor | Moves `SUBMITTED` to `UNDER_REVIEW`; repeat review is idempotent |
| POST | `/objections/:objectionId/decision` | Assigned professor | `{responseFa}` confirms, or `{responseFa,newScore}` changes and closes |

The first objection requires PostgreSQL `clock_timestamp() < Grade.publishedAt + 168 hours`. Rounds 2 and 3 require a resolved preceding round and `now < previous ObjectionDecision.decidedAt + 168 hours`. The exact boundary is excluded. At most three sequential rounds are allowed; one unresolved objection blocks the next. Grade row locking serializes round allocation and decisions. `newScore` is a decimal string with at most two places, must be different from current score, and must lie in `[0, Exam.maxPoints]`. To keep the grade, omit `newScore`. The professor's response is visible to the student after decision. A second decision is rejected with 409.

## Examples

```bash
curl -H 'Authorization: Bearer STUDENT_TOKEN' \
  'http://localhost:3000/api/v1/grades/performance?courseId=COURSE_UUID'

curl -H 'Authorization: Bearer STUDENT_TOKEN' \
  'http://localhost:3000/api/v1/courses/COURSE_UUID/grade-comparison'

curl -X POST -H 'Authorization: Bearer STUDENT_TOKEN' -H 'Content-Type: application/json' \
  -d '{"reasonFa":"Please review question 2."}' \
  http://localhost:3000/api/v1/grades/GRADE_UUID/objections

curl -X POST -H 'Authorization: Bearer PROFESSOR_TOKEN' \
  http://localhost:3000/api/v1/objections/OBJECTION_UUID/review

curl -X POST -H 'Authorization: Bearer PROFESSOR_TOKEN' -H 'Content-Type: application/json' \
  -d '{"responseFa":"The answer warrants one additional point.","newScore":"17.00"}' \
  http://localhost:3000/api/v1/objections/OBJECTION_UUID/decision
```

`npm run check`, `npm test`, `npm run build`, and `npx prisma validate` pass. Database integration testing is still required for concurrent objections/decisions, grade publication, row locking and ownership checks against a running PostgreSQL instance.
