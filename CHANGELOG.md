# Changelog — Hospital HMS

Har aham change is file mein documented hai. Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: `X.Y.Z.W` (policy: `docs/VERSIONING.md`).

## [Unreleased]

### Added
- **Phase 6 — Patient Experience (`0.4.0.0`)**
  - `/patient/documents` — scan/file upload UI (`scans` bucket) + new `patient_documents` table, categories, delete, signed-URL preview.
  - `/patient/vitals` — patient vitals history view (nurse records rendered).
  - `/patient/feedback` — feedback survey (rating 1–5, category, comments) + `feedback` table + own-submissions list.
  - Profile avatar upload — `avatars` bucket, `profiles.avatar_url` set/update, shown in AppShell user menu.
  - Appointment reminders — free **Meta WhatsApp Cloud API** cron `/api/cron/reminders` (Vercel Cron, 08:00) with `reminder_sent_at` dedupe + optional `CRON_SECRET`.
  - Telegram backup notifier — `src/lib/telegram/client.ts` (free open Bot API), cron summary alerts; `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` env.
  - Signup prefills — dob/gender/blood_group/address on registration → patient record (trigger updated in migration `00038`).
  - PWA — `app/manifest.ts` + `public/sw.js` offline shell cache + production `ServiceWorkerRegistration`.
  - Migration `00038_patient_experience.sql` (feedback, patient_documents, `appointments.reminder_sent_at`, updated `handle_new_user`).

### Added
- **Meta WhatsApp Business Cloud API integration** (free provider) — `src/lib/whatsapp/client.ts` ab Twilio ki jagah Graph API use karta hai; message ID (`wamid...`) `external_message_id` mein store hota hai.
- **Meta-compatible webhook** `/api/webhooks/whatsapp` — GET `hub.verify_token` verification + POST `statuses[]` (sent/delivered/failed) handling. `WHATSAPP_PHONE_NUMBER_ID/ACCESS_TOKEN/VERIFY_TOKEN` env vars.
- **Multi-language (i18n) system** — extensible `src/i18n/` architecture with English + Hindi (Devanagari) support, cookie/localStorage persistence, typed dictionaries for easy expansion.
- **Multi-colour theme system** — 5 accent presets (Teal, Green, Blue, Violet, Rose) with dark/light/system mode, `data-accent` attribute on `<html>`, `next-themes` for mode switching, accent picker UI.
- **Responsive AppShell layout** — shared `src/components/layout/app-shell.tsx` replacing 6 duplicate role layouts; desktop sidebar, mobile top bar + scrollable pill nav, icons per nav item.
- **ThemeProvider + LanguageProvider** — root layout wrapped with `Providers` component combining `next-themes` (dark/light/system) + custom i18n context.
- **Theme + language switchers** — `ThemeSwitcher`, `AccentSwitcher`, `LanguageSwitcher` components for app-wide use.
- **Role layouts redesigned** — all 6 role layouts (admin/doctor/nurse/lab/staff/patient) now use AppShell with translated nav items + lucide icons.

### Changed
- **FREE & Open Source policy enforced** (STRICT): plan + env config se saari paid services hata di —
  - Twilio (paid WhatsApp) → **Meta WhatsApp Business Cloud API** (free conversations tier)
  - Razorpay/payment gateway → **free UPI Intent QR** (no txn fees, manual reconciliation)
  - SendGrid/SMS gateway → **Telegram Bot API** (FOSS backup channel)
  - `.env.example` updated; `.env.local` mein TWILIO/WHATSAPP vars swapped.
- **globals.css** — Tailwind v4 dark mode (`@custom-variant dark`) + runtime CSS variables + accent palettes (multicolour themes via `data-accent`).
- **Landing page** — redesigned with i18n, theme+language switchers, lucide icons, responsive grid.
- **Login page** — i18n translated, responsive, theme+language controls in header.
- **Signup page** — i18n translated, responsive, theme+language controls.
- **6 dashboards** — i18n translated, icons added, responsive card layout with `shadow-sm`.

### Removed
- `twilio` npm dependency (29 transitive packages hataye).

## [0.1.0.0] — 2026-09-19

### Added
- **Baseline HMS release** — puri onboarding:
  - Auth: login (remember me, show/hide password, forgot/reset password), public signup, first-admin setup.
  - Roles: `admin, doctor, nurse, lab, staff, patient` with middleware + layout level route-guarding aur RLS.
  - Admin: dashboard, staff CRUD, patients, beds, inventory, audit log viewer.
  - Doctor: dashboard, today's OPD queue (token based), patient list + EMR history, prescription create/edit.
  - Nurse: dashboard, vitals recording, bed occupancy toggle.
  - Lab: dashboard, test queue, lab report interpretation/finalization.
  - Patient portal: appointment booking (per-doctor daily tokens), prescriptions, finalised lab reports, billing view.
  - Staff: invoice creation + "mark paid", room/bed cleaning status.
  - PDF templates: prescription, lab report, invoice (`@react-pdf/renderer`).
  - WhatsApp infra: Twilio sender + templates + status webhook + `whatsapp_logs`.
  - DB: profiles, patients, appointments, prescriptions, lab_reports, beds, invoices, whatsapp_logs, vitals_records, inventory_items, audit_logs + audit triggers + storage buckets + auth triggers.
- **Dependency upgrades**: Next 16.3.5, React 19.3.0, TypeScript 6.0.3, ESLint 9.39.5, and all packages to latest ecosystem-compatible versions.
- **Tooling**: `next lint` → `eslint .` (flat config `eslint.config.mjs`), disabled noisy `react-hooks/set-state-in-effect` rule, moved fetcher fn declarations above effects (3 files).

### Fixed
- Lint/build errors jo naye toolchain (Next 16 + ESLint 9 + TS 6) ne code mein wide the.

### Notes
- TypeScript intentionally capped at 6.0.3 (7.0.2 abhi typescript-eslint support nahi karta); ESLint capped at 9.x (10 abhi Next react plugins ke saath compatible nahi).
- Kuch gaps intentionally doc kiye gaye hain (see `docs/IMPLEMENTATION_PLAN.md`): inventory API wrong table name, `invoices.created_by` missing, UHID not set on admin add, bed allotment patient assignment, orphaned PDF/WhatsApp API calls — **Phase 0** mein fix honge.