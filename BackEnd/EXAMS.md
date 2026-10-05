# Exam management module

This extends the same Express/Prisma backend. It implements exam authoring and visibility only. Attempt creation, answers, uploads, scoring, grading and cutoff processing are separate modules. No schema migration is needed. All routes are under `/api/v1` and require a Bearer token.

## Access and lifecycle

- Professor: may create only on an active own `ProfessorAssignment` for the course and manage only an exam tied to that professor and still-active assignment. Admin: may create for an explicitly supplied active `assignmentId` and manage exams while the designated assignment is active. Student: may list/get only `PUBLISHED` exams for courses with active Enrollment. Student responses contain metadata and instructions, never questions, options or correct flags. Course-level access is checked in Prisma queries or services.
- `Exam.status` persists `DRAFT`, `PUBLISHED`, `CANCELLED`. “Closed” is **derived** when the PostgreSQL clock is at or past `endsAt` for a published exam; there is no `CLOSED` enum. Early close sets `endsAt` to database time and shortens any existing in-progress attempt deadlines to that instant. The later submission/cutoff worker must finalize those attempts using its own rules. An already-ended exam close is idempotent. Before the start, use cancel rather than close. Cancel rejects an exam with any attempts.
- Draft question content can be edited or deleted; published content and answer keys are locked. Draft exam deletion removes its options and questions only when it has no attempts or attached files, retaining academic history. Publication requires future end time, at least one question (or for descriptive exams an already-attached question file), positive points, and question totals equal `maxPoints` if structured questions exist. MCQ questions require at least two options and exactly one correct flag. Descriptive questions have no options.
- Scores and maximum are decimal **strings** with up to two places; timestamps are ISO 8601 with explicit UTC/offset. `durationMinutes` is positive or null; the later attempt module applies `min(endsAt, start+duration)`.

## Endpoints

| Method | URL                                                              | Role                      | Request body                                                                                                                                                     |
| ------ | ---------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/exams`                                                         | Professor, Admin          | `{courseId,assignmentId?,titleFa,instructionsFa?,type,startsAt,endsAt,durationMinutes?,maxPoints}`; admin requires `assignmentId`; professor assignment inferred |
| GET    | `/exams?courseId=&type=&status=&limit=&cursor=`                  | Student, Professor, Admin | List; student receives only authorized published exams                                                                                                           |
| GET    | `/exams/:examId`                                                 | Student, Professor, Admin | Scoped metadata                                                                                                                                                  |
| PATCH  | `/exams/:examId`                                                 | Professor, Admin          | Draft-only subset `{titleFa?,instructionsFa?,startsAt?,endsAt?,durationMinutes?,maxPoints?}`                                                                     |
| DELETE | `/exams/:examId`                                                 | Professor, Admin          | Draft-only, no attempts/files                                                                                                                                    |
| POST   | `/exams/:examId/publish`                                         | Professor, Admin          | No body                                                                                                                                                          |
| POST   | `/exams/:examId/close`                                           | Professor, Admin          | No body; early end                                                                                                                                               |
| POST   | `/exams/:examId/cancel`                                          | Professor, Admin          | No body; no attempts                                                                                                                                             |
| GET    | `/exams/:examId/questions`                                       | Professor, Admin          | Questions with options and correct flags                                                                                                                         |
| POST   | `/exams/:examId/questions`                                       | Professor, Admin          | `{promptFa,points,authorOrder}`                                                                                                                                  |
| PATCH  | `/exams/:examId/questions/:questionId`                           | Professor, Admin          | Subset `{promptFa?,points?,authorOrder?}`                                                                                                                        |
| DELETE | `/exams/:examId/questions/:questionId`                           | Professor, Admin          | Draft-only                                                                                                                                                       |
| PUT    | `/exams/:examId/questions/order`                                 | Professor, Admin          | `{questionIds:[...]}` complete ordered permutation; positions become 1..N                                                                                        |
| POST   | `/exams/:examId/questions/:questionId/options`                   | Professor, Admin          | `{textFa,position,isCorrect?}` for MCQ                                                                                                                           |
| PATCH  | `/exams/:examId/questions/:questionId/options/:optionId`         | Professor, Admin          | Subset `{textFa?,position?,isCorrect?}`                                                                                                                          |
| DELETE | `/exams/:examId/questions/:questionId/options/:optionId`         | Professor, Admin          | Draft-only                                                                                                                                                       |
| PUT    | `/exams/:examId/questions/:questionId/options/:optionId/correct` | Professor, Admin          | No body; atomically replaces the correct key                                                                                                                     |

Create returns 201, deletes 204, other successes 200 with `{data:...}`. Lists use `data.items` and optional `data.nextCursor`, `limit` 1–100. Bad body 422; unauthorized role 403; private or unrelated resources 404; uniqueness, state or locked content 409. Audit events are written in the same transaction as exam/question/option mutations. Editing order or choosing a correct answer uses exam row locking to serialize publication and draft edits.

## Example

```bash
curl -H 'Authorization: Bearer PROFESSOR_TOKEN' -H 'Content-Type: application/json' \
  -d '{"courseId":"COURSE_UUID","titleFa":"Final exam","type":"MULTIPLE_CHOICE","startsAt":"2026-10-01T09:00:00+03:30","endsAt":"2026-10-01T10:00:00+03:30","durationMinutes":45,"maxPoints":"20.00"}' \
  http://localhost:3000/api/v1/exams

curl -H 'Authorization: Bearer PROFESSOR_TOKEN' -H 'Content-Type: application/json' \
  -d '{"promptFa":"Select the best answer","points":"20.00","authorOrder":1}' \
  http://localhost:3000/api/v1/exams/EXAM_UUID/questions

curl -X POST -H 'Authorization: Bearer PROFESSOR_TOKEN' \
  http://localhost:3000/api/v1/exams/EXAM_UUID/publish
```

Run `npm ci`, `npx prisma generate`, `npm run check`, and `npm run build`. The module was validated without a live PostgreSQL instance; exercise transactional publication, conflicting question order, and close versus attempt start against the actual database before deployment.
