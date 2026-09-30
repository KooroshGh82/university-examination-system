# University Examination Management System — backend

Node.js/Express/TypeScript, PostgreSQL/Prisma, JWT authentication, courses, exams, MCQ and descriptive submissions, grades and objections. This package contains **the original database project's `20260927111945_initial_schema` migration** supplied by the user, followed by the additive migration `20260928140000_auth_sessions_and_grade_comments`. The new migration creates `auth_sessions` and adds nullable `grades.comments_fa`; it does not recreate academic tables. Keep this migration history with the backend project from now on.

## Run against the existing `exam_db`

1. Install Node.js 20+ and PostgreSQL. Extract the ZIP into your `BackEnd` directory, replacing the previous backend files. Keep a copy of your current `.env`; ZIP packages do not contain it.
2. In the **original database project's** `.env`, find the `DATABASE_URL` that worked when `initial_schema` was applied. Copy the entire value into `BackEnd/.env`. Do not send or commit that password. Example values in `.env.example` are placeholders and cannot authenticate.
3. Set different random `JWT_SECRET` and `REFRESH_PEPPER` values (at least 32 characters each), `APP_ORIGIN` to the exact frontend origin, `COOKIE_SECURE=false` for local HTTP, and `STORAGE_DIR` to an absolute path of a private persistent directory. Create it with `mkdir -m 700 private-files` and use `realpath private-files` to get its path.
4. In `BackEnd`, run:

```bash
npm ci
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate
npm run check
npm test
npm run dev
```

`migrate status` should recognize `20260927111945_initial_schema` as applied and show only `20260928140000_auth_sessions_and_grade_comments` pending. **Stop if it reports a different applied history**; do not reset the database. `migrate deploy` should apply only the additive migration. If it reports P1000, fix `DATABASE_URL` before retrying; no migration is applied with invalid credentials. The old ZIP's bundled `20260927130000_auth_sessions` fresh-database migration has been removed.

If no admin account exists, provision one once with `npm run bootstrap:admin` after setting `BOOTSTRAP_ADMIN_ID`, `BOOTSTRAP_ADMIN_NAME`, and `BOOTSTRAP_ADMIN_PASSWORD` for that command. See `scripts/create-admin.ts`. If the original database already has an admin, do not duplicate it.

The API defaults to `http://localhost:3000/api/v1`. For local login testing, include an Origin matching `APP_ORIGIN`:

```bash
curl -i -c cookies.txt -H 'Origin: http://localhost:5173' -H 'Content-Type: application/json' \
  -d '{"universityId":"admin001","password":"YOUR_ADMIN_PASSWORD"}' \
  http://localhost:3000/api/v1/auth/login
```

Use the returned access token in `Authorization: Bearer TOKEN`. `npm run build && npm start` runs the compiled server. The MCQ and descriptive cutoff/retention workers start with the server. `COURSES.md`, `EXAMS.md`, `MCQ_WORKFLOW.md`, `DESCRIPTIVE_WORKFLOW.md`, and `GRADES_OBJECTIONS.md` describe routes and rules.

## Database boundary

The original migration history is authoritative for the existing database. The bundled target schema differs from the uploaded original schema only by `User.authSessions`, the `AuthSession` model, and nullable `Grade.commentsFa`. The Prisma-generated additive SQL has been reviewed: one column, one table, two indexes and a foreign key. Actual connection and migration application must occur on your Linux machine because its PostgreSQL instance and credentials are not accessible here.

**Known policy discrepancy:** the current objection service enforces 168 hours, while a later project decision specified six months. Resolve that rule before using objection deadlines in production.

## Admin exam participants

Admins create student/professor accounts and manage participants under `/api/v1/admin`. Professors create courses and their own exams, then publish them. The admin panel lists each exam with its professor and course, supports selecting students by name/university ID, and adds/removes participants for that specific exam.

`20260930150000_exam_participants` adds the `exam_participants` table. It preserves existing course-based exam access by copying active enrollments for existing exams once. New course enrollment alone does not grant exam access: student exam listing, details, starting either exam type, and question-file access require an explicit exam participant record. Assignment also creates/reactivates the course enrollment required by the existing attempt schema. Removing an exam participant leaves course history intact and is refused after any attempt has started.

Run `node --import tsx scripts/verify-exam-assignments.ts` against a development database containing an admin, a professor, and two students to verify the full flow. Verification data is rolled back.
