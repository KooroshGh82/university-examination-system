# University Examination Management System

A university software engineering project for managing examinations,
student submissions, grading, and grade objections.

The application is designed for a Persian, right-to-left interface.

## Project Information

| Item | Details |
|---|---|
| Author | Koorosh Ghavidel Taghavi |
| University ID | 40114141054080 |
| Supervisor | Dr.Javad Shahparian |
| Documentation date | 04 Sep 2026 |

## Documentation

The full project report covers requirements, business rules, architecture,
database design, UML diagrams, examination workflows, security,
testing strategy, and deployment requirements.

[Download the project documentation](/Documentation.pdf)

## Project Scope

### Student

- View examinations for enrolled courses.
- Participate in multiple-choice and descriptive examinations.
- Navigate between MCQ questions and save selected answers.
- Download descriptive examination questions and upload answer files.
- View submission status and published grades.
- Compare published results within a course.
- Submit and track grade objections.

### Professor

- Manage examinations for assigned courses.
- Prepare and publish multiple-choice and descriptive examinations.
- Review student submissions.
- Assign descriptive examination scores.
- Publish grades.
- Respond to objections and preserve grade revision history.

### Administrator

- Provision university accounts.
- Manage course offerings.
- Maintain student enrollments and professor assignments.

These items describe the project scope. The documentation distinguishes
approved design from implementation that still requires verification.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT access and refresh tokens |

## Main Business Rules

- Accounts are created by the university; public registration is not provided.
- Students access only examinations for which they are eligible.
- Professors manage only examinations within their authorized assignments.
- Dates are presented using the Solar Hijri calendar.
- Examination deadlines are enforced using server time.
- At the MCQ deadline, saved answers are used for scoring;
  unanswered questions remain unanswered.
- A descriptive attempt without an accepted answer file at the deadline
  is marked absent.
- Correct answers are excluded from student question payloads before submission.
- MCQ scores are calculated on the backend.
- Students can view grades only after professor publication.
- Grade objections are allowed within the approved six-month period.
- Important grade changes retain revision history.

## Local Setup

### Prerequisites

- Node.js and npm compatible with the project package requirements
- PostgreSQL
- Git

### 1. Obtain the source code

Clone this repository and open its root directory.

### 2. Configure the backend

```bash
cd BackEnd
npm install
cp .env.example .env
```

Edit `.env` with your local PostgreSQL connection and the required
authentication and application settings.

Use `.env.example` as the configuration reference.
Do not commit `.env` or real credentials.

### 3. Prepare the database

For a new development database, create the database configured in
`DATABASE_URL`, then run:

```bash
npx prisma migrate deploy
npx prisma generate
```

For an existing database, check migration history first:

```bash
npx prisma migrate status
```

Do not reset an existing database or apply a conflicting initial migration.

### 4. Start the backend

From `BackEnd`:

```bash
npm run dev
```

### 5. Configure and start the frontend

Open another terminal and enter `FrontEnd`:

```bash
npm install
```

Configure the frontend API URL using the environment variable read by
the frontend code.

Then start the frontend:

```bash
npm run dev -- -p 3002
```

Open:

http://localhost:3002

The frontend API URL must match the backend address and port.
The backend CORS configuration must allow the frontend origin.

## Accounts

There is no public sign-up workflow.

Local demonstration accounts must be provisioned through the project's
seed procedure or administrative setup. Real account passwords are
not included in this repository.

## Testing

The documentation includes a testing strategy for authentication,
authorization, examination timing, submissions, grading, objections,
file uploads, and frontend workflows.

A test plan does not establish that tests have passed.
Executed results and known failures should be recorded separately.

## Academic Use

This repository was prepared as a university software engineering project.
Consult the full documentation for design assumptions, unresolved policies,
and implementation verification limits.
