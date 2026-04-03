# WellTrack – Implementation Tasks

Checkboxes track completion. Tasks are ordered by dependency — complete earlier phases before moving on.

---

## Phase 1: Backend Foundation (Weeks 1–3)

### Project Setup
- [x] Initialize Node.js + Express project with TypeScript
- [x] Set up folder structure (`src/routes`, `src/controllers`, `src/middleware`, `src/lib`)
- [ ] Configure environment variables (`.env`, `.env.example`) for DB URL, JWT secrets, etc.
- [ ] Set up ESLint + Prettier
- [ ] Initialize PostgreSQL database (local dev)
- [ ] Install and configure Prisma ORM, run `prisma init`

### Database Schema & Migrations
- [ ] Write Prisma schema for `User` model
- [ ] Write Prisma schema for `Symptom` and `SymptomLog` models
- [ ] Write Prisma schema for `MoodLog` model
- [ ] Write Prisma schema for `Medication` and `MedicationLog` models
- [ ] Write Prisma schema for `Habit` and `HabitLog` models
- [ ] Add indexes on `(user_id, logged_at)` for all log tables
- [ ] Run initial migration (`prisma migrate dev`)
- [ ] Write seed script to insert default symptoms (Headache, Fatigue, Joint Pain, etc.)
- [ ] Write seed script to insert default habits (Sleep Duration, Water Intake, Exercise, etc.)

### Authentication
- [ ] Implement `POST /api/auth/register` — hash password with bcrypt, return JWT
- [ ] Implement `POST /api/auth/login` — verify credentials, return access + refresh tokens
- [ ] Implement `POST /api/auth/refresh` — validate refresh token, issue new access token
- [ ] Implement `POST /api/auth/logout` — invalidate refresh token
- [ ] Implement `POST /api/auth/forgot-password` — generate reset token, send email
- [ ] Implement `POST /api/auth/reset-password` — validate token, update password hash
- [ ] Write JWT auth middleware to protect routes

### User Endpoints
- [ ] Implement `GET /api/users/me` — return current user profile
- [ ] Implement `PATCH /api/users/me` — update display name and timezone
- [ ] Implement `DELETE /api/users/me` — delete user and all associated data (cascade)

### Symptom Endpoints
- [ ] Implement `GET /api/symptoms` — return system defaults + user's custom symptoms
- [ ] Implement `POST /api/symptoms` — create custom symptom for current user
- [ ] Implement `PATCH /api/symptoms/:id` — update symptom (own or toggle `is_active`)
- [ ] Implement `DELETE /api/symptoms/:id` — delete custom symptom (block deleting system ones)
- [ ] Implement `GET /api/symptom-logs` with `startDate`, `endDate`, `limit`, `offset` query params
- [ ] Implement `POST /api/symptom-logs` — create log entry
- [ ] Implement `PATCH /api/symptom-logs/:id` — edit own log entry
- [ ] Implement `DELETE /api/symptom-logs/:id` — delete own log entry

### Mood Endpoints
- [ ] Implement `GET /api/mood-logs` with `startDate`, `endDate` params
- [ ] Implement `POST /api/mood-logs` — create mood log (score 1–5, optional energy/stress)
- [ ] Implement `PATCH /api/mood-logs/:id`
- [ ] Implement `DELETE /api/mood-logs/:id`

### Medication Endpoints
- [ ] Implement `GET /api/medications` — return user's active medications
- [ ] Implement `POST /api/medications` — add new medication
- [ ] Implement `PATCH /api/medications/:id` — edit or deactivate medication
- [ ] Implement `DELETE /api/medications/:id`
- [ ] Implement `GET /api/medication-logs` with date range params
- [ ] Implement `POST /api/medication-logs` — log taken/not-taken for a medication
- [ ] Implement `PATCH /api/medication-logs/:id`
- [ ] Implement `DELETE /api/medication-logs/:id`

### Habit Endpoints
- [ ] Implement `GET /api/habits` — return system defaults + user's custom habits
- [ ] Implement `POST /api/habits` — create custom habit with tracking type
- [ ] Implement `PATCH /api/habits/:id`
- [ ] Implement `DELETE /api/habits/:id`
- [ ] Implement `GET /api/habit-logs` with date range params
- [ ] Implement `POST /api/habit-logs` — log value (boolean, numeric, or duration)
- [ ] Implement `PATCH /api/habit-logs/:id`
- [ ] Implement `DELETE /api/habit-logs/:id`

### Validation & Error Handling
- [ ] Add request validation middleware (e.g., with Zod) for all endpoints
- [ ] Return consistent error response shape `{ error: string, details?: any }`
- [ ] Handle 404 for unknown routes
- [ ] Handle auth errors (401 unauthorized, 403 forbidden)

---

## Phase 2: Frontend Foundation (Weeks 4–6)

### React App Setup
- [ ] Initialize React + TypeScript app (Vite recommended)
- [ ] Install and configure Tailwind CSS
- [ ] Set up React Router with route definitions
- [ ] Create API client utility (Axios or fetch wrapper) that attaches JWT and handles 401s
- [ ] Set up global auth state (Context or Zustand) to store user + tokens

### Auth Pages
- [ ] Build Register page (email, password, display name fields)
- [ ] Build Login page
- [ ] Build Forgot Password page
- [ ] Build Reset Password page (reads token from URL)
- [ ] Implement protected route wrapper — redirect unauthenticated users to login

### Dashboard (Home Screen)
- [ ] Build Dashboard layout with header showing today's date
- [ ] Display "what you've logged today" summary section
- [ ] Add quick-add buttons for each log type (symptom, mood, medication, habit)
- [ ] Add a "days logged this week" streak indicator

### Log Entry Forms
- [ ] Build Symptom Log modal — symptom selector, severity slider (1–10), optional notes, date picker
- [ ] Build Mood Log modal — mood score (1–5), optional energy/stress levels, notes, date picker
- [ ] Build Medication Log modal — medication selector, taken checkbox, optional notes
- [ ] Build Habit Log modal — habit selector, value input (adapts to tracking type), notes, date picker
- [ ] Wire all forms to POST endpoints and refresh dashboard on success

---

## Phase 3: Full Features (Weeks 7–9)

### History View
- [ ] Build History page with entries grouped by day (newest first)
- [ ] Implement filter bar to show only symptoms / mood / meds / habits
- [ ] Make each entry expandable to show details
- [ ] Add Edit and Delete actions on individual entries

### Trend Charts
- [ ] Install a chart library (e.g., Recharts or Chart.js)
- [ ] Build symptom severity line chart with 7 / 30 / 90-day toggle
- [ ] Build mood / energy / stress line chart
- [ ] Build calendar heatmap showing days with logged entries

### Insights & Export Endpoints (Backend)
- [ ] Implement `GET /api/insights/trends` — return aggregated data by type and date range
- [ ] Implement `GET /api/export/csv` — stream a CSV of all user data for a date range

### Settings Screen
- [ ] Build Settings page with navigation sections
- [ ] Edit profile form (display name, timezone)
- [ ] Manage symptoms list — add custom, toggle visibility of system symptoms
- [ ] Manage habits list — add custom, toggle visibility of system habits
- [ ] Manage medications — add, edit, deactivate
- [ ] CSV export button with optional date range picker
- [ ] Delete account flow with confirmation dialog
- [ ] Logout button

### Customization Flows
- [ ] Add Custom Symptom form and wire to `POST /api/symptoms`
- [ ] Add Custom Habit form with tracking type selector
- [ ] Toggle hide/show for system symptoms and habits

---

## Phase 4: Polish & Launch (Weeks 10–12)

### Testing
- [ ] Write integration tests for auth endpoints (register, login, refresh, logout)
- [ ] Write integration tests for symptom log CRUD
- [ ] Write integration tests for mood, medication, and habit log CRUD
- [ ] Test CSV export output

### Performance & Accessibility
- [ ] Verify all log table queries use the `(user_id, logged_at)` index
- [ ] Add loading states and skeleton screens to dashboard and history
- [ ] Test and fix mobile responsiveness (all screens usable on small screens)
- [ ] Check color contrast and keyboard navigation for basic accessibility

### Deployment
- [ ] Choose hosting provider (Vercel for frontend, Railway or Render for backend)
- [ ] Set up production environment variables
- [ ] Configure HTTPS
- [ ] Run final database migration on production
- [ ] Deploy backend and confirm all endpoints respond correctly
- [ ] Deploy frontend and confirm it connects to production API

### Beta Launch
- [ ] Create onboarding instructions or welcome screen for first-time users
- [ ] Onboard initial beta users and collect feedback
