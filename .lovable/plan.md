# Ujian CBT — Implementation Plan

A web-based Computer Based Test (CBT) application for schools with three roles (Admin, Guru, Siswa), built on TanStack Start + React + Tailwind, powered by Lovable Cloud (Supabase) for auth, database, and storage.

## Tech Stack
- TanStack Start (already scaffolded) + React 19 + Tailwind v4
- Lovable Cloud (Supabase) — Auth (email/password), Postgres + RLS, Storage
- shadcn/ui components, blue primary theme

## Database Schema (migration)

Enums: `app_role` (admin, guru, siswa), `question_type` (pg, esai), `exam_status` (draft, aktif, selesai), `attempt_status` (berlangsung, selesai).

Tables (all in `public` with proper GRANTs + RLS):
- **profiles** (id uuid PK → auth.users, nama text, role app_role, kelas text)
- **subjects** (id, nama_mapel)
- **questions** (id, subject_id, pembuat_id, tipe, pertanyaan, opsi_jawaban jsonb, kunci_jawaban, bobot int, tingkat_kesulitan, gambar_url)
- **exams** (id, judul, subject_id, pembuat_id, durasi_menit, waktu_mulai, waktu_selesai, token, acak_soal bool, acak_opsi bool, status)
- **exam_questions** (id, exam_id, question_id, urutan)
- **exam_attempts** (id, exam_id, siswa_id, waktu_mulai, waktu_selesai, skor numeric, status)
- **answers** (id, attempt_id, question_id, jawaban_siswa, benar bool) — unique(attempt_id, question_id) for upsert/auto-save

Security:
- `has_role(uuid, app_role)` SECURITY DEFINER function
- Trigger to auto-create profile (default role: siswa) on signup
- RLS:
  - Admin: full on profiles/subjects; can read all
  - Guru: CRUD own questions/exams; read all subjects; read attempts/answers for their exams
  - Siswa: read active exams (with valid token verification at server fn), CRUD own attempts/answers, read own profile
- Storage bucket `question-images` (public read, auth write)

Seed (in migration): 1 subject (Matematika), 5 MC questions, 1 active exam linking those 5 questions with token `CBT123`.

## Routing Structure

```
/                       → landing (redirect to dashboard if logged in)
/auth                   → login + register tabs
/_authenticated/
  dashboard             → role-based redirect
  admin/                → users, subjects management
  guru/
    questions           → bank soal CRUD
    exams               → exam CRUD + question picker
    grading             → student results
  siswa/
    exams               → available exams list + token entry
    exam/$attemptId     → exam taking UI (fullscreen, timer, grid nav)
    result/$attemptId   → result page
```

`_authenticated/route.tsx` is integration-managed (don't author).

## Key Components & Features

### Auth
- Email/password sign-up assigns role `siswa` by default via trigger
- Admin can promote users to guru/admin via Admin dashboard

### Admin Dashboard
- Stat cards (counts via server fn)
- User table with role select + delete
- Subjects CRUD

### Guru Dashboard
- Bank Soal: dialog form, 4–5 options, correct answer select, bobot/difficulty, image upload to Storage
- Exam builder: metadata + multi-select questions from bank, schedule pickers, token, randomize toggles
- Grading: list attempts per exam with scores

### Siswa Dashboard
- Available exams (filtered by waktu_mulai/selesai window)
- Token prompt → creates `exam_attempts` row → navigate to exam page
- **Exam taking page**:
  - Request fullscreen on mount, hide app shell
  - Countdown timer (computed from waktu_mulai + durasi_menit) auto-submits on 0
  - Question grid sidebar with status colors (answered/unanswered/ragu)
  - "Tandai ragu-ragu" toggle stored client-side + persisted as flag in answers
  - Auto-save: on answer change, upsert into `answers` via server fn (debounced)
  - Resume: existing attempt loads saved answers
  - Shuffle: if `acak_soal`/`acak_opsi`, deterministic per-attempt seed
  - Submit confirmation dialog → server fn computes score for `pg` (sum bobot where benar) and writes to attempt
- Result page: shows skor + per-question breakdown for MC

### Auto-grading
Server fn `submitAttempt`: loads answers + correct keys, marks `benar`, sums bobot for correct answers (normalized to 100), updates attempt status & skor.

## Server Functions (`src/lib/*.functions.ts`)
- `auth.functions` — promoteUser (admin only)
- `stats.functions` — admin counts
- `subjects.functions` — CRUD
- `questions.functions` — CRUD with image URL handling
- `exams.functions` — CRUD, list-for-student
- `attempts.functions` — startAttempt (verify token + window), saveAnswer (upsert), submitAttempt (grade)
- `grading.functions` — list attempts for guru

All use `requireSupabaseAuth` + role checks via `has_role` RPC.

## Design
- Tailwind v4 tokens in `src/styles.css`: blue primary (`oklch(0.55 0.18 250)`), neutral background, subtle borders, rounded-xl cards
- AppShell with sidebar nav per role; hidden during exam taking (fullscreen)
- Mobile responsive: collapsible sidebar, grid → stacked

## Out of scope (defaults applied)
- Essay grading UI: questions are MC-only per spec for auto-grading; essay type stored but no UI in v1
- No email confirmation (auto-confirm via Cloud default)
- Token is plain string match (no expiry beyond window)
