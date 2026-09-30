# University examination — Student frontend

Persian RTL Student interface built with Next.js App Router, React, TypeScript and Tailwind CSS. It uses the documented Express REST contract at `/api/v1` and does not compute exam eligibility, scores, deadlines or objection windows.

## Run

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `BACKEND_API_URL` to your running backend API prefix, for example `http://localhost:4000/api/v1`. Set `BACKEND_APP_ORIGIN` to exactly match `APP_ORIGIN` in `BackEnd/.env`; the proxy uses it for login, logout and session refresh. Restart Next.js after changing these settings.
3. `npm run dev`, then open `http://localhost:3000/login`.

The frontend is a standalone directory because the backend repository was not present in the shared workspace. Integrate it beside your backend, or copy `src`, configs and dependencies into your existing Next.js frontend. The API paths and DTOs come from `BACKEND_ARCHITECTURE.md`; compare them with your current implemented controllers before connecting. Authentication expects `POST /auth/login` to return `{data:{accessToken,user}}` plus a refresh cookie. The same-origin Next.js proxy stores access and refresh cookies as HttpOnly and forwards calls to the backend. Configure HTTPS, cookie and Origin/CSRF policies for your actual deployment. No sample data is shown as real academic results.

The dashboard loads complete paginated lists for its aggregate view. For large production datasets, add a backend dashboard summary endpoint instead of loading all records. The browser countdown is informational; all mutations are decided by the backend. File upload progress is transport progress, and the file only counts after the backend acknowledges it; final submission is a separate operation.

## Professor interface

The same login routes `PROFESSOR` accounts to `/professor/dashboard`. The Professor area includes assigned courses, MCQ and descriptive exam drafts, question/option/correct-answer editing, question scores, publication/cancellation, submissions, descriptive file review, individual grade entry/publication, and objection decisions with optional revised score. Draft editing controls are shown only for active assignments; the backend checks every read and write again. There is no independent close-now endpoint in the documented API: published exams close at their scheduled `endsAt`, while cancellation uses `POST /exams/:id/cancel`.

Professor scheduling inputs use Solar Hijri date/time in `Asia/Tehran` and convert to ISO timestamps for the API. The current backend contract exposes `GET /attempts` and `GET /grades` as separate records and does not guarantee student identity in the attempt list projection. The UI displays student information when the actual API provides it and falls back to an attempt ID otherwise. A running backend was not included in this workspace, so verify exact DTOs, cookie/CSRF deployment settings, and the real endpoint behavior during integration.

## Linux native-binding recovery

This revision uses Tailwind CSS 3 with PostCSS instead of the Tailwind 4 native Oxide binding. After replacing an earlier frontend copy, remove its old `node_modules` and `.next`, then run `npm ci` using this revision's `package-lock.json`. The backend runs separately on port 3000; run Next.js on port 3001 and set `BACKEND_API_URL=http://localhost:3000/api/v1`.
