# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WellTrack is a wellness tracking web app for people with chronic health conditions. Users log symptoms, moods, medications, and habits, then view trends. Stack: React + TypeScript frontend (not yet scaffolded), Node.js/Express backend, PostgreSQL via Prisma ORM.

## Repository Structure

```
welltrack/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── app.ts        # Express app setup (routes mounted here)
│   │   ├── index.ts      # Server entrypoint (binds port)
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # Express routers
│   │   ├── middleware/   # Auth and validation middleware
│   │   ├── lib/          # Shared utilities (e.g., Prisma client)
│   │   └── __tests__/    # Jest tests (unit + integration)
│   ├── prisma/
│   │   └── schema.prisma # Data model (empty — needs models added)
│   ├── src/generated/prisma/ # Auto-generated Prisma client (do not edit)
│   └── .env.example      # Required environment variables
├── docker-compose.yml    # PostgreSQL local dev container
└── Documents/
    ├── Requirements.md   # Full product spec with data models and API endpoints
    └── Tasks.md          # Ordered implementation checklist
```

## Backend Commands

All commands run from `backend/`:

```bash
npm run dev          # Start dev server with hot reload (ts-node + nodemon)
npm run build        # Compile TypeScript to dist/
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode

npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:migrate   # Run migrations (creates/applies migration files)
npm run db:studio    # Open Prisma Studio GUI
```

Run a single test file:
```bash
npx jest src/__tests__/health.unit.test.ts
```

## Local Database

Start PostgreSQL via Docker (from repo root):
```bash
docker compose up -d
```
Connection: `postgresql://welltrack:welltrack@localhost:5432/welltrack`

Copy `backend/.env.example` to `backend/.env` before starting the server.

## Architecture Notes

- **App vs index split:** `src/app.ts` creates and exports the Express app (used in tests); `src/index.ts` starts the server. Always import `app` in tests rather than starting the real server.
- **Prisma client output:** Generated to `src/generated/prisma/` (not the default location). Import from there, not from `@prisma/client`.
- **Tests:** Integration tests spin up a real HTTP server on a random port using `app.listen(0, ...)`. Unit tests import `app` directly via supertest without binding.
- **Auth design:** JWT access tokens (15m expiry) + refresh tokens (7d). Middleware lives in `src/middleware/`. Unused params in Express handlers should be prefixed `_` to satisfy the ESLint rule.
- **Data ownership:** Symptoms and Habits have `user_id = null` for system defaults. User-owned records have a real `user_id`. All log tables need a composite index on `(user_id, logged_at)`.
- **Error shape:** All error responses must use `{ error: string, details?: any }`.

## Git Workflow
When completing tasks from TASKS.md:

Create a new branch named feature/<task-number>-<brief-description> before starting work
Make atomic commits with conventional commit messages:
feat: for new features
fix: for bug fixes
docs: for documentation
test: for tests
refactor: for refactoring
After completing a task, create a pull request with:
A descriptive title matching the task
A summary of changes made
Any testing notes or considerations
Update the task checkbox in TASKS.md to mark it complete
