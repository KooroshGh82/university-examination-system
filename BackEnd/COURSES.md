# Course management module

Mounted at `/api/v1` in the existing Express app. All endpoints require a Bearer access token. Student and professor listings include historical inactive links; future exam access must check `isActive=true`. All IDs are UUIDs. JSON responses use `{ "data": ... }`; lists return `{ "data": { "items": [...], "nextCursor"?: "..." } }`. Lists support `limit` 1–100 (default 20) and UUID `cursor`. `termCode` filters course and own-course lists; `isActive` filters admin link lists.

| Method | URL | Role | Body / purpose |
| --- | --- | --- | --- |
| POST | `/courses` | Admin | `{code,titleFa,termCode}` |
| GET | `/courses?termCode=&limit=&cursor=` | Admin, Student, Professor | Admin all; student/professor linked only |
| GET | `/courses/:courseId` | Admin, Student, Professor | Scoped course |
| PATCH | `/courses/:courseId` | Admin | Nonempty subset of `{code,titleFa,termCode}` |
| DELETE | `/courses/:courseId` | Admin | Only if no enrollment, assignment, or exam; otherwise 409 |
| POST | `/courses/:courseId/enrollments` | Admin | `{studentId}`; active student account |
| GET | `/courses/:courseId/enrollments?isActive=&limit=&cursor=` | Admin | Enrollment list |
| PATCH | `/courses/:courseId/enrollments/:enrollmentId` | Admin | `{isActive}` |
| POST | `/courses/:courseId/assignments` | Admin | `{professorId}`; active professor account |
| GET | `/courses/:courseId/assignments?isActive=&limit=&cursor=` | Admin | Assignment list |
| PATCH | `/courses/:courseId/assignments/:assignmentId` | Admin | `{isActive}` |
| GET | `/students/me/courses?termCode=&limit=&cursor=` | Student | Own courses, `enrollmentId`, `isActive` |
| GET | `/professors/me/courses?termCode=&limit=&cursor=` | Professor | Own courses, `assignmentId`, `isActive` |

Duplicate course code/term or link returns 409. Reactivate an existing link with PATCH. Course deletion is restricted to never-used courses; historical links remain. Admin mutations append an `AuditEvent` in the same transaction. The Prisma schema and migration remain unchanged.

```bash
curl -H 'Authorization: Bearer ADMIN_TOKEN' -H 'Content-Type: application/json' \
  -d '{"code":"SE301","titleFa":"مهندسی نرم‌افزار","termCode":"1405-1"}' \
  http://localhost:3000/api/v1/courses

curl -H 'Authorization: Bearer ADMIN_TOKEN' -H 'Content-Type: application/json' \
  -d '{"studentId":"STUDENT_UUID"}' \
  http://localhost:3000/api/v1/courses/COURSE_UUID/enrollments

curl -H 'Authorization: Bearer STUDENT_TOKEN' \
  http://localhost:3000/api/v1/students/me/courses
```
