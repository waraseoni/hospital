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
| 0 | Foundation & Core Fixes | `0.2.0.0` | [ ] — i18n + theming [DONE] |
| 0.3 | Shared Components + Bug Fixes | `0.3.0.0` | [ ] |
| 0.4 | Core Workflow Integration | `0.4.0.0` | [ ] |
| 0.5 | Enhanced Pages | `0.5.0.0` | [ ] |
| 0.6 | Settings + Polish | `0.6.0.0` | [ ] |
| 1 | Clinical Workflows | `0.7.0.0` | [ ] |
| 2 | Pharmacy & Inventory | `0.8.0.0` | [ ] |
| 3 | Billing & Finance | `0.9.0.0` | [ ] |

> **Detailed UX/UI plan:** See `docs/UX_UI_PLAN.md` for per-page layouts, interconnections, mobile-first design rules, and component library roadmap.

---

## Phase 0 — Foundation & Core Fixes (`0.2.0.0`)

Sabse pehle — foundation, kyunki iske bina baaki phases shaky hain.

### Fixes (bugs from audit)
- [ ] Inventory API wrong table name (`inventory` → `inventory_items`)
- [ ] `invoices.created_by` missing column → migration `00014_invoices_created_by.sql`
- [ ] Admin "Add Patient" UHID generate (`generateUHID()` call) + server double-check
- [ ] Nurse "Allot Bed" actual patient assign (patient search → `current_patient_id`)
- [ ] Wire PDF + WhatsApp calls into real UI workflow (see Features 1/2 below)
- [x] Lega WhatsApp Free: refactor `src/lib/whatsapp/client.ts` — **Twilio REST → FREE Meta WhatsApp Business Cloud API** (`POST graph.facebook.com/v*/<phone-id>/messages`), webhook verify token ke saath; `twilio` npm package remove ho gaya — **DONE**
- [ ] Dead deps cleanup: `zustand`, `react-hook-form`, `zod` — ya to adopt karo ya hatao
- [ ] Org/settings groundwork (below) → PDFs, WhatsApp, billing sab yahi se data lein

### New features in this phase
1. **Settings / Hospital Profile module** (`/admin/settings`)
   - DB: `settings` table (key-value JSONB, single org row): hospital name, address, phone, GSTIN, logo URL, tax default, receipt footer, WhatsApp number.
   - PDF templates (`src/lib/pdf/*`) aur WhatsApp templates ab hard-coded strings ke bajaye settings se render hote hain.
   - `src/lib/settings.ts` client + server getters (cached 60s).
2. **PDF + WhatsApp auto-wiring**
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

1. **Doctor Schedule & Slot Booking**
   - DB: `doctor_schedules` (doctor_id, weekday, start/end, slot_minutes, enabled); `appointments` mein `booked_at`, optional `slot_time`.
   - Patient booking: doctor page par day-wise free slots (availability query = appointments count vs capacity).
   - Doctor page: schedule editor (`/doctor/schedule`).
2. **Revisit / Follow-up Automation**
   - Prescription ke `follow_up_date` par reminder entry (WhatsApp template `appointmentReminder` wiring) + auto-suggest booking.
3. **Doctor → Lab Order Flow**
   - OPD "Write prescription" mein "Order Tests" section → `lab_reports` `pending` create with `ordered_by=doctor_id`.
   - Lab queue me doctor's orders visible (`ordered_by`).
4. **IPD Admission + Discharge**
   - DB: `admissions` (patient, doctor, admission_date, ward_type, bed_id, status, discharge_date, remarks); `beds` w/ `admission_id`.
   - Nurse/admin "Admit Patient", bed assign, per-day charges auto-accrue → billing (Phase 3).
   - "Discharge" → discharge summary (template, `discharge_summaries` table or JSONB on admissions), auto billing of bed days + services.
5. **Emergency / ER Triage**
   - `/er` route (role `staff`+): triage (stable → critical), `emergency` consultation type flow, quick patient registration, room/bed ICU suggestion.
6. **Progress Notes / Case Sheet**
   - DB: `progress_notes` (patient, doc, note, vitals_snapshot JSONB, timestamp). Sheet view per admission/opd.
7. **Radiology / Imaging**
   - DB: `imaging_requests` (patient, doc, modality xray/mri/ct/usg, part, report JSONB, status, images[]); `scans` storage bucket UI upload.
   - Lab role extended ya naya `radiologist` role (optional enums; default lab).
8. **Medical Certificates**
   - `/doctor/certificates` → JSONB certificate types (discharge, fitness, sick-leave) rendered as PDF via react-pdf.
9. **Vaccination Records**
   - DB: `vaccinations` (patient, vaccine, dose, administered_by, date, next_due). Schedule reminders (WhatsApp).

**DB:** migrations `00014`–`00022`. **API:** lab-order, admissions, imaging, certificates. **Version:** minor → `0.3.0.0` (feature-by-feature minor bumps `0.2.x.0` se).

---

## Phase 2 — Pharmacy & Inventory (`0.4.0.0`)

1. **Pharmacy Dispensing**
   - "Write prescription" se medicines → `prescription_medicine_items` (joined) ya JSONB normalise; dispensing screen: qty issue → `inventory_items.quantity` deduct + `stock_transactions`.
   - DB: `stock_transactions` (item, type in/out, qty, ref prescription/bill, user, ts).
2. **Purchase Orders / Suppliers / Procurement**
   - DB: `suppliers`, `purchase_orders`, `purchase_order_items`. Admin UI: create PO, receive + stock in.
3. **Expiry / Batch tracking UI**
   - `inventory_items` ka expiry_date/batch_number UI form + alerts (30/7 days) + batch-wise stock views.
4. **Department Requisitions**
   - `requisitions` (from dept, items[], status); pharmacy approve → issue → stock out.
5. **Pharmacy POS**
   - `/staff/pharmacy` counter: add medicines (from inventory), discount %, bill → invoice `line_items` + consume stock + receipt PDF.

**DB:** migrations `00023`–`00027`. **Version:** minor → `0.4.0.0`.

---

## Phase 3 — Billing & Finance (`0.5.0.0`)

1. **Receipt Printing & PDF Download UI**
   - Invoice list (`/staff` and `/admin/billing`) mein "Download PDF" + "Print receipt" buttons; wire existing `/api/invoices`.
2. **Discount & Package/Panel Policies**
   - `insurance_panels`/`packages` tables (package → services + rate + discount%); invoice par apply.
3. **Insurance / TPA Claims**
   - DB: `claims` (invoice_id, insurer_code, policy_no, approval_no, stage intimation|preauth|claim, amount, status).
   - `/staff/claims` UI: create claim from invoice, track stages.
4. **Payment Receipts**
   - `payments` table (invoice, amount, method, reference, at, by) — partial payments track (abhi sirf `paid_at`).
   - Receipt PDF template.
5. **UPI QR Payment (FREE — no gateway)**
   - Koi payment gateway nahi. **UPI Intent/QR** (`upi://pay?pa=UPI_ID&pn=HOSPITAL&am=amount`) generate karo (`qrcode` npm pkg, MIT) — ye UPI ka free, official deep-link protocol hai, koi txn fee nahi.
   - Invoice print par UPI QR; payment verify manual reconciliation (staff "Confirm payment" record) — `payments` table update.
   - No gateway account, no API fees.

**DB:** migrations `00028`–`00031`. **Version:** minor → `0.5.0.0`.

---

## Phase 4 — Operations & Administration (`0.6.0.0`)

1. **Staff Attendance, Leave & Duty Roster**
   - DB: `attendance`, `leaves`, `rosters`. Admin UI: mark daily attendance, leave approval, roster per shift.
2. **Housekeeping Workflow**
   - `housekeeping_tasks` (room/bed, type deep|regular, assigned_staff, status) — staff "Assign", housekeeper "Complete" → `beds.is_ready`.
3. **Equipment / Asset Tracking**
   - DB: `equipment` (name, category, hospital dept, tag, purchase_info, warranty, status, last_service). Maintenance log table.
4. **Ambulance Module**
   - DB: `ambulances` (vehicle no, type BLS/ALS, driver, ready); `ambulance_calls` (patient/address/condition/trip, status). Admin assign + call log.
5. **Blood Bank**
   - DB: `blood_donations`, `blood_inventory` (group, component, unit, expiry, status), `blood_requests` (patient, group, qty, status). Cross-match vs patients blood_group.
6. **Queue/TV Display Monitor**
   - `/public/queue` route: token-wise next-up per doctor (live realtime via supabase channel) — TV ne screen ke liye.

**DB:** migrations `00032`–`00037`. **Version:** minor → `0.6.0.0`.

---

## Phase 5 — Reporting & Analytics (`0.7.0.0`)

1. **Revenue Reports** — /admin/reports/revenue (OPD/IPD/Lab/Pharmacy, date range, chart).
2. **Doctor-wise Collections** — per-doctor billing summary.
3. **Inventory Valuation & Reorder Alerts** — current stock value, low-stock list, expiring batches.
4. **Daily/Monthly MIS Reports** — admissions, discharges, OP/IP census, avg stay, compliance counts.
5. **Enhanced Dashboard + Charts** — reuse `lucide`/`recharts` (optional) on admin/doctor dashboards.
6. **CSV/Excel Export** — every report download button.

**DB:** koi naya table nahi (aggregation queries). Add `reports` view set (migration) for heavy ones.
**Version:** minor → `0.7.0.0`.

---

## Phase 6 — Patient Experience (`0.8.0.0`)

1. **Appointment Reminders (FREE WhatsApp)** — `appointmentReminder` template via **Meta WhatsApp Cloud API** (free conversations tier) cron (Supabase pg_cron ya Vercel Cron) 1 din pehle.
2. **Scan/File Upload UI** — patient documents (prescriptions, reports, reports ke scans) → `scans` bucket, `/patient/documents`.
3. **Vitals History View** — `/patient/vitals` (nurse ke records render karana).
4. **Feedback Survey** — `feedback` table (satisfaction score, comments, catchment). Notification.
5. **Profile / Avatar Management UI** — avatar upload (`avatars` bucket), update profile.
6. **Multi-language UI** — [DONE] i18n (custom dictionary): en/hi first. RTL not needed for hi. Extensible architecture in `src/i18n/`.
7. **Online Registration prefills** — signup flow extra fields.
8. **PWA / Offline mode** — Next PWA setup: offline shell for queue/OPD.
9. **Notifications backup (FREE + Open Source)** — **Telegram Bot API** (free protocol, open) as secondary channel: patient admin group ya patient se alert. SMS/Email paid/sendgrid nahi — koi paid gateway nahi.

**DB:** `feedback`, `patient_documents`. **Version:** minor → `0.8.0.0`.

---

## Phase 7 — Integration & Advanced (`0.9.0.0`)

1. **e-Prescription Digital Signature** — signature image in PDF + `prescription.signature_url`, QR verification endpoint.
2. **HL7 / FHIR Interop (optional, enterprise)** — export patient/prescription/lab via FHIR JSON endpoints.
3. **Backup & Restore process doc** — Supabase CLI / pg_dump scripts + env of secrets.
4. **API Documentation** — every `/api/*` endpoint in OpenAPI doc + doc page.
5. **Multi-branch/Org support (optional)** — `organization_id` on tables; multi settings row.

**Version:** minor → `0.9.0.0`.

---

## Cross-cutting Notes

- **Types sync**: har migration ke baad `src/types/database.ts` update zaroori (DB schema mirror).
- **RLS**: har nayi table ke liye RLS policies + roles matrix. Har sensitive data par row-level.
- **Audit trigger**: sensitive new tables (`invoices`, `prescriptions`, `lab_reports`, `admissions`, `payments`) ko audit trigger se cover kare (Phase 0 mein generic trigger bana dena best).
- **Env vars**: naye integrations ke liye `.env.example` update karna.
- **Testing**: har phase ke liye manual test checklist + (optional) vitest unit tests for token/settings/version utils.
- **Performance**: Supabase realtime sirf monitoring/queue screens par, nahi toh polling/throttle.

## Dependencies Order Map

Phase 0 → (settings, PDF/WhatsApp wiring) is required by: Phase 1 (certificates), Phase 2 (dispensing), Phase 3 (receipts). `follow_up_date` data (Phase 1) → reminders (Phase 6). Stock transactions (Phase 2) → valuation reports (Phase 5).