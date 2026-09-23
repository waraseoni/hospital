# Implementation Plan — Hospital HMS (Missing Features Roadmap)

Ye plan `CHANGELOG.md` se linked hai. Har phase ek version target rakhta hai. Feature komple hone par:
`[ ]` → `[x]` mark karo + `npm run version:minor` + changelog update.

Version target: `${MAJOR}.${PHASE}.${PATCH}.${BUILD}` (see `docs/VERSIONING.md`).

---

## ⚖️ Free & Open Source Policy (STRICT — MUST follow)

**Project mein koi bhi paid feature/service allowed nahi hai. Sab kuch free + open source.**

Rules:
1. **Koi paid SaaS / paid-tier service use nahi hogi.** Agar kisi service ka free tier hai but closed-source hai, to tab bhi nahi — jab tak pure-FOSS free option mile.
2. **Saare npm packages ki licence MIT/Apache/BSD-family honi chahiye** (no paid/commercial SDK).
3. **Notifications** → FREE **Meta WhatsApp Business Cloud API** (no per-message charge, loggite hai conversations; no SDK licence) + ek FOSS backup (**Telegram Bot API** — free protocol).
4. **Payments** → **koi payment gateway nahi.** Free **UPI Intent QR** (`upi://pay?pa=...`) generation + manual reconciliation. No txn fees, no gateway account.
5. **Kisi bhi provider ki paid tier nahi** — agar free tier limited ho to equivalent FOSS provider/self-host ka use karo.
6. Agar koi team-mate koi paid service suggest kare to ise reject karo aur FOSS alternative do.

> Deprecated (paid / not-FOSS) — plan se hata diya: **Twilio** (WhatsApp paid), **Razorpay/payment gateway** (txn fees), **SendGrid/SMS gateway** (freemium/closed).

---

## Progress Tracker

| # | Phase | Target Version | Status |
|---|---|---|---|
| 0 | Foundation & Core Fixes | `0.2.0.0` | [x] — i18n + theming [DONE] |
| 0.3 | Shared Components + Bug Fixes | `0.3.0.0` | [x] — UI library, bug fixes [DONE] |
| 0.4 | Core Workflow Integration | `0.4.0.0` | [x] — PDF/WhatsApp, Profile page, User Management [DONE] |
| 0.5 | Enhanced Pages | `0.5.0.0` | [x] — Admin user mgmt, Profile, all navs fixed [DONE] |
| 0.6 | Settings + Polish | `0.6.0.0` | [x] — Settings module, PDF+WhatsApp wiring, invoices.created_by [DONE] |
| 1 | Clinical Workflows | `0.7.0.0` | [x] — Schedule, Lab Order, IPD, Notes, Follow-up, ER, Certificates, Vaccination, Imaging [DONE] |
| 2 | Pharmacy & Inventory | `0.8.0.0` | [x] — Dispensing, PO/Suppliers, Expiry/Batch, Requisitions, POS [DONE] |
| 3 | Billing & Finance | `0.9.0.0` | [x] — Receipts/PDF, Packages/Panels, Claims, Payments, UPI QR [DONE] |
| 4 | Operations & Administration | `1.0.0.0` | [x] — Attendance/Leave/Roster, Housekeeping, Equipment, Ambulance, Blood Bank, Queue Display [DONE] |
| 5 | Reporting & Analytics | `1.1.0.0` | [x] — Revenue/Doctor/Inventory/MIS reports, CSV export, dashboard charts [DONE] |
| 6 | Patient Experience | `0.4.0.0` | [x] — Docs, Vitals, Feedback, Avatar, Reminders, Signup prefill, PWA [DONE] |
| 7 | Integration & Advanced | `0.5.0.0` | [x] — e-Prescription digital signature + QR verify, FHIR R4 export, Backup/Restore, OpenAPI docs, Branches [DONE] |
| 8 | Security, Audit & Testing | `0.6.0.0` | [ ] — Uniform API auth guard, DB audit triggers, Audit UI filters/CSV, vitest + API auth tests, error/loading routes, admin/leaves page |
| 9 | Super Admin Impersonation | `0.6.0.0` | [x] — Audited impersonation, read-only lock, role switcher, countdown timer, history page, dashboard widget [DONE] |
| 10 | Impersonation UX Polish | `0.6.0.0` | [x] — Reason prompt, view-as on staff/admins, read-only lock, countdown timer, history page [DONE] |

> **Detailed UX/UI plan:** See `docs/UX_UI_PLAN.md` for per-page layouts, interconnections, mobile-first design rules, and component library roadmap.

---

## Phase 0 — Foundation & Core Fixes (`0.2.0.0`)

Sabse pehle — foundation, kyunki iske bina baaki phases shaky hain.

### Fixes (bugs from audit)
- [ ] Inventory API wrong table name (`inventory` → `inventory_items`)
- [x] `invoices.created_by` missing column → migration `00017_add_invoices_created_by.sql` **DONE**
- [x] Admin "Add Patient" UHID generate (`generateUHID()` call) + server double-check **DONE**
- [x] Nurse "Allot Bed" actual patient assign (patient search → `current_patient_id`) **DONE**
- [x] Wire PDF + WhatsApp calls into real UI workflow (see Features 1/2 below) **DONE** — PDFs use settings from DB, WhatsApp auto-sends on prescription/lab-report creation
- [x] Lega WhatsApp Free: refactor `src/lib/whatsapp/client.ts` — **Twilio REST → FREE Meta WhatsApp Business Cloud API** (`POST graph.facebook.com/v*/<phone-id>/messages`), webhook verify token ke saath; `twilio` npm package remove ho gaya — **DONE**
- [ ] Dead deps cleanup: `zustand`, `react-hook-form`, `zod` — ya to adopt karo ya hatao
- [x] Org/settings groundwork (below) → PDFs, WhatsApp, billing sab yahi se data lein **DONE**

### New features in this phase
1. **Settings / Hospital Profile module** (`/admin/settings`) **DONE**
   - DB: `settings` table (key-value JSONB, single org row): hospital name, address, phone, GSTIN, logo URL, tax default, receipt footer, WhatsApp number.
   - PDF templates (`src/lib/pdf/*`) aur WhatsApp templates ab hard-coded strings ke bajaye settings se render hote hain.
   - `src/lib/settings.ts` client + server getters (cached 60s).
2. **PDF + WhatsApp auto-wiring** **DONE**
   - `/api/prescriptions`, `/api/lab-reports`, `/api/invoices` ko UI flows se jodo:
     - Doctor prescription save → PDF generate + upload + `pdf_url` + optional WhatsApp.
     - Lab finalize → PDF + WhatsApp.
     - Verify QR/verify-link option.
3. **Route/UI consistency**: UHID display, error toasts (React Hook Form + zod adopt karo agar deger garni ho; else remove).

**DB:** migrations `00014` (settings/logistics). **API:** `/api/settings`, extended `/api/prescriptions|labs|invoices`.
**Version:** minor → `0.2.0.0`

---

## Phase 1 — Clinical Workflows (`0.3.0.0`)

Doctor ka core workflow — abhi OPD sirf token queue + free-form prescription hai.

1. **Doctor Schedule & Slot Booking** **DONE**
   - DB: `doctor_schedules` (doctor_id, weekday, start/end, slot_minutes, enabled); `appointments` mein `booked_at`, optional `slot_time`.
   - Patient booking: doctor page par day-wise free slots (availability query = appointments count vs capacity).
   - Doctor page: schedule editor (`/doctor/schedule`).
2. **Revisit / Follow-up Automation** **DONE**
   - Prescription ke `follow_up_date` par reminder entry (WhatsApp template `appointmentReminder` wiring) + auto-suggest booking.
3. **Doctor → Lab Order Flow** **DONE**
   - OPD "Write prescription" mein "Order Tests" section → `lab_reports` `pending` create with `ordered_by=doctor_id`.
   - Lab queue me doctor's orders visible (`ordered_by`).
4. **IPD Admission + Discharge** **DONE**
   - DB: `admissions` (patient, doctor, admission_date, ward_type, bed_id, status, discharge_date, remarks); `beds` w/ `admission_id`.
   - Nurse/admin "Admit Patient", bed assign, per-day charges auto-accrue → billing (Phase 3).
   - "Discharge" → discharge summary (template, `discharge_summaries` table or JSONB on admissions), auto billing of bed days + services.
5. **Emergency / ER Triage** **DONE**
   - `/er` route (role `staff`+): triage (stable → critical), `emergency` consultation type flow, quick patient registration, room/bed ICU suggestion.
6. **Progress Notes / Case Sheet** **DONE**
   - DB: `progress_notes` (patient, doc, note, vitals_snapshot JSONB, timestamp). Sheet view per admission/opd.
7. **Radiology / Imaging** **DONE**
   - DB: `imaging_requests` (patient, doc, modality xray/mri/ct/usg, part, report JSONB, status, images[]); `scans` storage bucket UI upload.
   - Lab role extended ya naya `radiologist` role (optional enums; default lab).
8. **Medical Certificates** **DONE**
   - `/doctor/certificates` → JSONB certificate types (discharge, fitness, sick-leave) rendered as PDF via react-pdf.
9. **Vaccination Records** **DONE**
   - DB: `vaccinations` (patient, vaccine, dose, administered_by, date, next_due). Schedule reminders (WhatsApp).

**DB:** migrations `00014`–`00022`. **API:** lab-order, admissions, imaging, certificates. **Version:** minor → `0.3.0.0` (feature-by-feature minor bumps `0.2.x.0` se).

---

## Phase 2 — Pharmacy & Inventory (`0.4.0.0`)

1. **Pharmacy Dispensing** **DONE**
   - "Write prescription" se medicines → `prescription_medicine_items` (joined) ya JSONB normalise; dispensing screen: qty issue → `inventory_items.quantity` deduct + `stock_transactions`.
   - DB: `stock_transactions` (item, type in/out, qty, ref prescription/bill, user, ts).
2. **Purchase Orders / Suppliers / Procurement** **DONE**
   - DB: `suppliers`, `purchase_orders`, `purchase_order_items`. Admin UI: create PO, receive + stock in.
3. **Expiry / Batch tracking UI** **DONE**
   - `inventory_items` ka expiry_date/batch_number UI form + alerts (30/7 days) + batch-wise stock views.
4. **Department Requisitions** **DONE**
   - `requisitions` (from dept, items[], status); pharmacy approve → issue → stock out.
5. **Pharmacy POS** **DONE**
   - `/staff/pharmacy` counter: add medicines (from inventory), discount %, bill → invoice `line_items` + consume stock + receipt PDF.

**DB:** migrations `00026`–`00029` (00023–00025 used by Phase 1). **Version:** minor → `0.4.0.0`.

---

## Phase 3 — Billing & Finance (`0.5.0.0`)

1. **Receipt Printing & PDF Download UI** **DONE**
   - Invoice list (`/staff` and `/admin/billing`) mein "Download PDF" + "Print receipt" buttons; wire existing `/api/invoices` + `/api/billing/receipt`.
2. **Discount & Package/Panel Policies** **DONE**
   - `insurance_panels`/`packages` tables (package → services + rate + discount%); invoice par apply.
3. **Insurance / TPA Claims** **DONE**
   - DB: `claims` (invoice_id, insurer_code, policy_no, approval_no, stage intimation|preauth|claim, amount, status).
   - `/staff/claims` UI: create claim from invoice, track stages.
4. **Payment Receipts** **DONE**
   - `payments` table (invoice, amount, method, reference, at, by) — partial payments track.
   - Receipt PDF template (InvoicePDF kind=receipt).
5. **UPI QR Payment (FREE — no gateway)** **DONE**
   - Koi payment gateway nahi. **UPI Intent/QR** (`upi://pay?pa=UPI_ID&pn=HOSPITAL&am=amount`) generate hota hai (`qrcode` npm pkg, MIT).
   - Invoice print par UPI QR; payment verify manual reconciliation (staff "Confirm payment") — `payments` table update.
   - No gateway account, no API fees.

**DB:** migrations `00030`–`00032` (00026–00029 used by Phase 2). **Version:** minor → `0.5.0.0`.

---

## Phase 4 — Operations & Administration (`0.6.0.0`)

1. **Staff Attendance, Leave & Duty Roster** **DONE**
   - DB: `attendance`, `leaves`, `rosters`. Admin UI: mark daily attendance, leave approval, roster per shift.
2. **Housekeeping Workflow** **DONE**
   - `housekeeping_tasks` (room/bed, type deep|regular, assigned_staff, status) — staff "Assign", housekeeper "Complete" → `beds.is_ready`.
3. **Equipment / Asset Tracking** **DONE**
   - DB: `equipment` (name, category, hospital dept, tag, purchase_info, warranty, status, last_service). Maintenance log table.
4. **Ambulance Module** **DONE**
   - DB: `ambulances` (vehicle no, type BLS/ALS, driver, ready); `ambulance_calls` (patient/address/condition/trip, status). Admin assign + call log.
5. **Blood Bank** **DONE**
   - DB: `blood_donations`, `blood_inventory` (group, component, unit, expiry, status), `blood_requests` (patient, group, qty, status). Cross-match vs patients blood_group.
6. **Queue/TV Display Monitor** **DONE**
   - `/public/queue` route: token-wise next-up per doctor (live realtime via supabase channel) — TV ne screen ke liye.

**DB:** migrations `00033`–`00037`. **Version:** minor → `0.6.0.0`.

---

## Phase 5 — Reporting & Analytics (`1.1.0.0`) **[DONE]**

1. **Revenue Reports** **DONE** — `/admin/reports` Revenue tab (OPD/IPD/Lab/Pharmacy, date range, CSS bar chart).
2. **Doctor-wise Collections** **DONE** — per-doctor billing summary table + chart.
3. **Inventory Valuation & Reorder Alerts** **DONE** — stock value, low-stock list, expiring ≤30d batches.
4. **Daily/Monthly MIS Reports** **DONE** — admissions, discharges, OP/IP census, avg stay, bed occupancy, lab pending.
5. **Enhanced Dashboard + Charts** **DONE** — pure CSS bars (FOSS, no recharts) on reports page; lucide icons.
6. **CSV/Excel Export** **DONE** — Export CSV button on every report tab.

**DB:** koi naya table nahi — `/api/reports` aggregation queries only.
**Version:** minor → `1.1.0.0`.

---

## Phase 6 — Patient Experience (`0.4.0.0`) **[DONE]**

1. **Appointment Reminders (FREE WhatsApp)** **DONE** — `appointmentReminder` template via **Meta WhatsApp Cloud API** (free conversations tier); cron `/api/cron/reminders` (Vercel Cron, `vercel.json`, 08:00 daily) 1 din pehle; `reminder_sent_at` se dedupe; optional `CRON_SECRET`.
2. **Scan/File Upload UI** **DONE** — `/patient/documents` (`patient_documents` table) → `scans` bucket, category (prescription/lab/invoice/scan/other), delete, signed-URL preview.
3. **Vitals History View** **DONE** — `/patient/vitals` (nurse ke records render karta he).
4. **Feedback Survey** **DONE** — `feedback` table (rating 1–5, category, comments), `/patient/feedback` — post survey + pending submissions.
5. **Profile / Avatar Management UI** **DONE** — avatar upload (`avatars` bucket, `profiles.avatar_url`) profile + AppShell display.
6. **Multi-language UI** — [DONE] i18n (custom dictionary): en/hi first. RTL not needed for hi. Extensible architecture in `src/i18n/`.
7. **Online Registration prefills** **DONE** — signup flow extra fields (dob, gender, blood_group, address) → `raw_user_meta_data` → patient row (trigger updated in 00038).
8. **PWA / Offline mode** **DONE** — `app/manifest.ts` + `public/sw.js` offline shell cache (queue/OPD), `ServiceWorkerRegistration` in production.
9. **Notifications backup (FREE + Open Source)** **DONE** — **Telegram Bot API** (`src/lib/telegram/client.ts`, open protocol) as secondary channel: cron summary alerts. SMS/Email paid nahi.

**DB:** `feedback`, `patient_documents`, `appointments.reminder_sent_at` (migration `00038`). **Version:** minor → `0.4.0.0`.

---

## Phase 7 — Integration & Advanced (`0.5.0.0`) **[DONE]**

1. **e-Prescription Digital Signature** [DONE] — signature image (doctor profile upload → `signatures` bucket) in prescription PDF + `prescription.signature_url`, QR verification endpoint `/api/prescriptions/verify/[id]`.
2. **HL7 / FHIR Interop (optional, enterprise)** [DONE] — FHIR R4 export endpoints: `Patient`, `Prescription` (MedicationRequest Bundle), `DiagnosticReport` (+ Observations), CapabilityStatement; optional `FHIR_API_TOKEN` machine auth.
3. **Backup & Restore process doc** [DONE] — `docs/BACKUP_RESTORE.md` + `scripts/backup.ps1` / `restore.ps1` (pg_dump + gzip, 14-day retention), `SUPABASE_DB_URL` env secret.
4. **API Documentation** [DONE] — `public/openapi.json` (OpenAPI 3.0 — sabhi `/api/*` endpoints) + admin `/admin/api-docs` viewer page.
5. **Multi-branch/Org support (optional)** [DONE] — foundation: `branches` table + RLS, admin Branches UI, `settings.branch_id`. Note: full row-level `organization_id` scoping across tables is the documented future extension.

**Version:** minor → `0.5.0.0`.

---

## Phase 8 — Security, Audit & Testing (`0.6.0.0`)

> **Priority P0** — healthcare data par security + audit + automated tests. Exploration se mile concrete gaps (`file:line` evidence).

1. **Uniform API auth guard** — `src/middleware.ts` `/api` ko login-redirect se exempt karta hai, isliye har route ko apna role check chahiye — pattern inconsistent hai.
   - Add `requireRole(...roles)` / `requireAuth()` helper (reuse `src/lib/fhir/auth.ts` session pattern) and apply to **every** `src/app/api/**` route.
   - Fix known gaps: `src/app/api/patients/route.ts` POST (**no auth check at all**), `src/app/api/profile/route.ts` PUT (field-whitelist to prevent mass-assignment), `src/app/api/setup/route.ts` (one-time-only setup lock — abhi super_admin repeatedly create ho sakta hai).
   - Tighten storage-bucket read policies (`00011_create_storage_buckets.sql`) so cross-tenant reads are impossible once multi-branch lands.
2. **DB audit triggers** — `audit_logs` table (`old_data`/`new_data`) exists (`00010_create_inventory_and_audit.sql`) but **koi trigger populate nahi karta** (plan line 216 unfinished).
   - Generic `set_updated_at`-style `audit_trigger()` function + triggers on `invoices`, `prescriptions`, `lab_reports`, `admissions`, `payments` (INSERT/UPDATE/DELETE, capture `old`/`new` JSONB + `auth.uid()` actor).
   - Migration `00040_audit_triggers.sql` + regenerate `schema.sql`.
3. **Audit UI filters + CSV export** — `src/app/admin/audit/page.tsx` aur `src/app/super-admin/audit/page.tsx` sirf last-100 read-only rows dikhate hain.
   - Filter by actor / table / action / date-range; CSV export button (Phase 5 pattern reuse).
4. **Testing infrastructure (FOSS)** — abhi **zero** tests hain (`package.json` mein `test` script nahi, koi `*.test.*` file nahi) — healthcare codebase ke liye risk.
   - Add **vitest** (MIT) + `"test"` script in `package.json`.
   - Unit tests: token/settings/version utils (plan line 218).
   - Integration tests: critical API auth behavior — patients POST, profile PUT whitelist, setup lock, prescriptions verify (public), FHIR token gate.
   - Per-phase manual test checklist doc (`docs/TESTING.md`).
5. **UX resilience + missing admin surface** — `src/app/**` mein **zero** `loading.tsx` / `error.tsx` / `not-found.tsx`; `src/app/admin/leaves/` folder **empty** (API `/api/leaves` Phase 4 se exist karta hai, UI nahi).
   - Branded `loading.tsx` + `error.tsx` (auth-error aware) + `not-found.tsx` on key route groups (admin, staff, doctor, patient).
   - Build `/admin/leaves` page: leave list + approve/reject (wire `/api/leaves`).

**DB:** migration `00040`. **Version:** minor → `0.6.0.0`.

---

## Cross-cutting Notes

- **Types sync**: har migration ke baad `src/types/database.ts` update zaroori (DB schema mirror).
- **Full schema**: har nayi migration file ke baad `npm run schema` → `supabase/schema.sql` (all migrations concatenated, idempotent full schema) regenerate karo. Check: `npm run schema:check`.
- **RLS**: har nayi table ke liye RLS policies + roles matrix. Har sensitive data par row-level.
- **Audit trigger**: sensitive new tables (`invoices`, `prescriptions`, `lab_reports`, `admissions`, `payments`) ko audit trigger se cover kare (Phase 0 mein generic trigger bana dena best).
- **Env vars**: naye integrations ke liye `.env.example` update karna.
- **Testing**: har phase ke liye manual test checklist + (optional) vitest unit tests for token/settings/version utils.
- **Performance**: Supabase realtime sirf monitoring/queue screens par, nahi toh polling/throttle.

## Dependencies Order Map

Phase 0 → (settings, PDF/WhatsApp wiring) is required by: Phase 1 (certificates), Phase 2 (dispensing), Phase 3 (receipts). `follow_up_date` data (Phase 1) → reminders (Phase 6). Stock transactions (Phase 2) → valuation reports (Phase 5).