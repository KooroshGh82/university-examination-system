# Descriptive examination workflow

This module extends the same backend. It reuses `/api/v1/exams`, `/api/v1/exams/:examId/attempts`, `/api/v1/attempts`, `/api/v1/attempts/:attemptId`, `/api/v1/attempts/:attemptId/submit`, `/api/v1/attempts/:attemptId/grade` and `/api/v1/grades/:gradeId/publish`. Only a nullable `Grade.commentsFa` field was added to Prisma, with an incremental migration. The existing initial migration remains unchanged.

## Setup

Set `STORAGE_DIR` to an absolute directory on a **private persistent volume** writable only by the backend identity. Do not mount it as static web content or place it in a publicly served directory. This implementation uses private local filesystem storage; for multiple API hosts, put them on a securely shared volume or replace the `privateStore` adapter with private object storage. Files have generated UUID storage keys and mode 0600. The service authorizes every download and returns an attachment with a generated safe name. No raw path or storage key is returned to clients.

```bash
# Fresh standalone database: apply all bundled migrations.
npx prisma migrate deploy
npx prisma generate
# Existing project/database: copy the Grade.commentsFa field into its schema,
# create/apply only the new migration (ALTER TABLE grades ADD COLUMN comments_fa TEXT),
# and retain its existing migration history.
npm run check
npm test
npm run build
```

The example `.env.example` includes `STORAGE_DIR`. The backend requires PostgreSQL and the existing authentication variables. For local development, point it to a private local directory; for deployment, use a protected persistent volume and backups.

## Endpoints

| Method | URL | Role | Request / result |
| --- | --- | --- | --- |
| GET | `/exams?type=DESCRIPTIVE` | Student | Only published exams in actively enrolled courses |
| POST | `/exams/:examId/question-files` | Assigned professor or admin | multipart `file` PDF, draft exam only, max 5 MiB; 201 file metadata |
| GET | `/exams/:examId/question-files` | Student, assigned professor, admin | Student must have active enrollment, exam published and currently in window |
| DELETE | `/exams/:examId/question-files/:fileId` | Assigned professor or admin | Draft only; 204 |
| GET | `/files/:fileId/download` | Authorized student/professor/admin | Private attachment; 410 after byte purge |
| POST | `/exams/:examId/attempts` | Student | Start/resume descriptive exam during `[startsAt,endsAt)` with active enrollment; returns attempt, deadline and empty questions array |
| POST | `/attempts/:attemptId/files` | Student | multipart `file`, one per request; PDF/JPG/JPEG/PNG, <=5 MiB each; max five accepted files |
| GET | `/attempts/:attemptId/files` | Student or assigned professor | Student own files; professor only after final submission |
| DELETE | `/attempts/:attemptId/files/:fileId` | Student | Remove own draft file before deadline/finalization; 204 |
| POST | `/attempts/:attemptId/submit` | Student | Requires 1–5 accepted files before deadline, atomically freezes attempt; repeat returns receipt |
| GET | `/attempts/:attemptId` | Student, assigned professor | Student own status/files; professor submitted attempt/files and draft grade |
| GET | `/attempts?examId=...` | Student, assigned professor | Student own attempts including ABSENT; professor finalized submissions only |
| PUT | `/attempts/:attemptId/grade` | Assigned professor | `{ "score":"16.50", "commentsFa":"Optional feedback" }`; draft only, score 0..exam max |
| POST | `/grades/:gradeId/publish` | Assigned professor | Publish this student's draft grade once |
| GET | `/attempts/:attemptId/grade` | Student, assigned professor | Student only after individual publication, including comments; professor sees draft |

All JSON endpoints use the existing `{data:...}` envelope. Uploaded file bytes are never in JSON. Unknown fields and bad UUIDs are rejected. The server checks actual byte signatures, MIME and extension together; it never derives a storage path from the uploaded filename. Download names are generated from file ID. The object store itself is inaccessible publicly.

At deadline, an in-progress descriptive attempt becomes `ABSENT` with **no Grade**. A late final submission returns 409 after committing ABSENT, and uploads alone never count as submission. The worker marks due attempts ABSENT and cleans up unsubmitted bytes; final answer bytes are retained six calendar months after final submission, then purged while `StoredFile` metadata and academic history remain. Deadline decisions use PostgreSQL time. Only the assigned, active professor can view submitted answer bytes or save/publish a draft Grade; comments stay hidden from students until publication.

## Example

```bash
curl -X POST -H 'Authorization: Bearer PROFESSOR_TOKEN' -F 'file=@questions.pdf;type=application/pdf' \
  http://localhost:3000/api/v1/exams/EXAM_UUID/question-files

curl -X POST -H 'Authorization: Bearer STUDENT_TOKEN' \
  http://localhost:3000/api/v1/exams/EXAM_UUID/attempts

curl -X POST -H 'Authorization: Bearer STUDENT_TOKEN' -F 'file=@answers.pdf;type=application/pdf' \
  http://localhost:3000/api/v1/attempts/ATTEMPT_UUID/files

curl -X POST -H 'Authorization: Bearer STUDENT_TOKEN' \
  http://localhost:3000/api/v1/attempts/ATTEMPT_UUID/submit

curl -X PUT -H 'Authorization: Bearer PROFESSOR_TOKEN' -H 'Content-Type: application/json' \
  -d '{"score":"16.50","commentsFa":"Clear explanation"}' \
  http://localhost:3000/api/v1/attempts/ATTEMPT_UUID/grade
```

The local test suite covers file content/type mismatch, size caps, and six-month date clamping. A running PostgreSQL instance is still needed to test upload/submit races, deadline cutoffs, authorization, grade publication and retention jobs. The worker runs in the app process; for production deployments, run it as a separately monitored worker with shared storage and retry/cleanup monitoring.
