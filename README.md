# Prep Notebook LMS (INeedPOSN)

Next.js 14 + TypeScript + Tailwind + Prisma + PostgreSQL + NextAuth.

## What's actually implemented (real, working code)

- **Database schema** (`prisma/schema.prisma`) — every model from the agreed
  spec: User, Subject, Category, Course, Lesson, Attachment, Quiz, Question,
  QuizAttempt, Enrollment, LessonProgress, Payment, PageBlock, ThemeSetting,
  AuditLog.
- **Auth** — NextAuth credentials login, bcrypt password hashing
  (`lib/auth.ts`).
- **Device-lock (anti account-sharing)** — every login mints a new session id
  and overwrites `User.currentSessionId`; the JWT callback re-checks this on
  every request; `middleware.ts` rejects stale sessions server-side
  (`lib/device-lock.ts`, `middleware.ts`).
- **RBAC enforced server-side** — `middleware.ts` blocks `/admin/*` and
  `/api/admin/*` for non-admins at the edge; `lib/rbac.ts`'s `requireAdmin()` /
  `requireUser()` re-check inside every mutating route handler, so there is
  no path (URL guessing, direct API calls) that bypasses it. This directly
  fixes the "student could reach admin editing" issue from the mockups —
  there is no client-side toggle in real code, only real login + role check.
- **Registration** (`app/api/auth/register/route.ts`) — collects first name,
  last name, nickname, school, grade level, phone, email, password.
- **Payments** — PromptPay dynamic QR with the amount baked in
  (`lib/promptpay.ts`), slip upload to S3/R2-compatible storage
  (`lib/storage.ts`), admin approve/reject flow that activates the
  enrollment and writes an audit log entry.
- **Admin → student email notifications** — fires the moment a student
  uploads a payment slip (`lib/email.ts`, wired into
  `app/api/payments/[id]/slip/route.ts`). Student also gets emailed when
  their payment is reviewed.
- **Subject auto-provisioning** — `lib/subjects.ts`'s `provisionSubject()`
  creates a default category and an empty per-subject promo `PageBlock`
  whenever a subject is created via `/api/subjects`, so adding a subject
  needs no manual follow-up wiring elsewhere in the system.
- **Lesson progress + auto-complete** — `/api/lessons/[lessonId]/progress`
  marks a lesson complete once 90% watched; dashboard computes course % from
  real `LessonProgress` rows, not a hardcoded number.
- **Quiz auto-grading** — `/api/quizzes/[quizId]/submit`.
- **Seed script** (`prisma/seed.ts`) — creates an admin login
  (`admin@ineedposn.com` / `ChangeMe123!` — **change this immediately**), one
  subject, one course, one lesson, one quiz.

## What's still scaffolding / needs to be built next

- OTP email verification flow (`otpCode`/`otpExpiry` fields exist; the
  send/verify endpoints are not wired yet).
- The Design Studio (Canva-style drag-and-drop admin editor) — `PageBlock`
  model and the publish/audit-log plumbing exist; the actual drag-and-drop
  canvas UI shown in the mockups still needs to be built as React
  components.
- Course/lesson/quiz admin CRUD *pages* (the API routes for courses exist;
  lesson + quiz admin forms, drag-reorder UI, and the theme editor UI are
  not built yet).
- PDF viewer and rich-text renderer for non-video lesson types.
- Real-time device-session polling component on the client
  (`/api/device-session` exists as a target; the polling hook itself isn't
  wired into a layout yet).
- Certificates, notifications bell, analytics dashboard, search/filter —
  not started.

## Local setup

```bash
npm install
cp .env.example .env        # fill in real values
npm run db:push             # create tables from schema.prisma
npm run db:seed              # creates admin login + sample course
npm run dev
```

## Deployment (matches the agreed "no self-hosted server" requirement)

1. **Database** — create a Postgres instance on
   [Supabase](https://supabase.com) or [Neon](https://neon.tech) (both have
   a free tier with point-in-time recovery on paid plans). Copy the
   connection string into `DATABASE_URL`.
2. **Object storage** — create a bucket on
   [Cloudflare R2](https://developers.cloudflare.com/r2/) (cheapest, no
   egress fees) for slips/attachments/cover images. Fill in the `STORAGE_*`
   env vars.
3. **Email** — sign up for [Resend](https://resend.com), verify your sending
   domain, put the API key in `RESEND_API_KEY`.
4. **Hosting** — push this repo to GitHub, import it into
   [Vercel](https://vercel.com), add all the env vars from `.env.example` in
   the Vercel project settings, deploy. Vercel runs `prisma generate`
   automatically via the `postinstall` script.
5. **Domain** — buy the domain from any registrar (Namecheap, Porkbun,
   Cloudflare Registrar — expect ~300–500 THB/year, no registrar gives a
   .com away permanently free) and point it at the Vercel project. Using
   Vercel's free `*.vercel.app` subdomain instead costs nothing.
6. Run `npx prisma db push` once against the production `DATABASE_URL`
   (or set up a migration step in CI) before the first deploy goes live,
   then `npm run db:seed` once to create the real admin account —
   **change the seeded password immediately after**.
