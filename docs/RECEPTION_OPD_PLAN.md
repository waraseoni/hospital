# Reception & OPD System — Complete Implementation Plan

## Overview
Real hospital mein patient software access nahi karta. Patient hospital aata hai, reception par registration hota hai, token milta hai, wait karta hai, doctor ke paas jaata hai. Ye plan usi real-world flow ko implement karta hai.

---

## Current System Gaps

| # | Gap | Impact |
|---|-----|--------|
| 1 | **No reception page** | Patients can only self-register (unrealistic) |
| 2 | **No walk-in registration** | Staff can't register patients at front desk |
| 3 | **No OPD queue management** | No token display, no queue board |
| 4 | **Doctor can't see vitals** | Vitals recorded by nurse but not shown to doctor |
| 5 | **Incomplete patient history** | No allergies, blood group, vitals in doctor view |
| 6 | **Token race condition** | Client-side token generation has no locking |
| 7 | **No consultation type usage** | opd/emergency/follow_up field never set by booking |

---

## Existing Database Tables (No New Tables Needed)

- **patients**: uhid, name, dob, gender, phone, address, blood_group, allergies, medical_history (JSONB), user_id (nullable)
- **appointments**: patient_id, doctor_id, date_slot, token_no, status, consultation_type, notes. UNIQUE(doctor_id, date_slot, token_no)
- **vitals_records**: patient_id, nurse_id, bp_systolic, bp_diastolic, pulse, spo2, temperature, weight, height, respiratory_rate, pain_scale
- **prescriptions**: patient_id, doctor_id, appointment_id, diagnosis, symptoms, medicines (JSONB), follow_up_date
- **lab_reports**: patient_id, doctor_id, test_name, test_category, test_data, status

---

## Existing Roles

| Role | Pages |
|------|-------|
| super_admin | `/super-admin/*` |
| admin | `/admin/*` |
| doctor | `/doctor/*` (dashboard, opd, prescriptions, patients) |
| nurse | `/nurse/*` (dashboard, vitals, beds) |
| lab | `/lab/*` (dashboard, queue, reports) |
| staff | `/staff/*` (dashboard, rooms) — NO reception |
| patient | `/patient/*` (dashboard, appointments, prescriptions, reports, billing) |

---

## Progress

| # | Milestone | Status | Commit |
|---|-----------|--------|--------|
| 1.1 | Walk-in Patient Registration | [x] Done | `cd79698` |
| 1.2 | Appointment Booking API | [x] Done | `9f332cd` |
| 1.3 | Today's Queue View | [x] Done | `37299dc` |
| 1.4 | Server-side Token Generation | [x] Done | `9ca387b` |
| 2.1 | Patient History Panel | [x] Done | `1d96f78` |
| 2.2 | Enhanced OPD Queue | [x] Done | `bbb20d3` |
| 2.3 | Vitals Display for Doctor | [x] Done | `1d96f78` |

---

## Real-World OPD Flow (Target)

```
Patient walks in → Reception Desk
  → Receptionist searches patient (phone/name/UHID)
  → If new: quick register (name, phone, age, gender)
  → Book appointment with doctor → Auto token number
  → Print token slip → Patient goes to waiting area

Token Display Board shows current token per doctor
  → When turn comes → Ward boy/helper calls patient

Patient goes to doctor cabin
  → Doctor sees full patient history on screen
  → Doctor starts consultation
  → Writes prescription / orders tests

Patient goes to pharmacy/lab
  → Comes back to doctor with reports
  → Doctor finalizes treatment
```

---

## PHASE 1: Reception Desk (Core OPD Flow) — PRIORITY

### Milestone 1.1: Walk-in Patient Registration

**Create:**
- `src/app/staff/reception/page.tsx`

**Modify:**
- `src/app/staff/layout.tsx` — Add "Reception" nav item

**i18n keys:** `reception.*` in en.ts and hi.ts

**Created files:**
- `src/app/staff/reception/page.tsx` — Reception desk page
- `src/app/staff/layout.tsx` — Added "Reception" nav item
- `src/i18n/dictionaries/en.ts` — Added `reception.*` keys
- `src/i18n/dictionaries/hi.ts` — Added `reception.*` keys

**Features:**
- [x] Quick patient search (by phone, name, or UHID)
- [x] Search results: name, UHID, phone, last visit
- [x] "New Patient" button → quick registration form
- [x] Form: name, phone, DOB, gender, address, blood group, allergies
- [x] Auto UHID generation (server-side, per-year sequence)
- [x] Duplicate check by phone before creating
- [x] Walk-in patients (no user_id) supported
- [x] After registration, auto-select for booking

---

### Milestone 1.2: Appointment Booking from Reception

**Create:** `src/app/api/reception/book-appointment/route.ts`

**Modified:** `src/app/staff/reception/page.tsx` — Now uses server-side API

**Features:**
- [x] Doctor dropdown (all doctors with specialization)
- [x] Date (today default, future dates allowed)
- [x] Consultation type (opd/emergency/follow_up)
- [x] Notes field (optional)
- [x] Server-side token generation (atomic, no race condition)
- [x] Returns appointment data with token number
- [x] Staff-only access check

**Created files:**
- `src/app/api/reception/book-appointment/route.ts`

---

### Milestone 1.3: Today's Queue View

**Create:** `src/app/api/reception/today-queue/route.ts`

**Modified:** `src/app/staff/reception/page.tsx` — Now uses today-queue API

**Features:**
- [x] Appointments grouped by doctor
- [x] Each section: doctor name, specialization, queue count, current token
- [x] Each appointment: token #, patient name, UHID, status badge, time
- [x] Cancel appointment (with confirmation)
- [ ] Auto-refresh every 30 seconds

---

### Milestone 1.4: Server-side Token Generation

**Create:** `src/app/api/reception/book-appointment/route.ts` (already created in 1.2)

**Features:**
- [x] Database-level locking for token generation
- [x] Atomic insert with retry for UNIQUE constraint
- [x] Return generated token number

---

## PHASE 2: Doctor OPD Enhancement

### Milestone 2.1: Patient History Panel

**Modify:** `src/app/doctor/opd/page.tsx`

**Create:** `src/app/api/doctors/patient-history/[patientId]/route.ts`

**Features (shown when History button clicked):**
- [x] Profile: name, age, gender, phone, UHID, blood group, allergies
- [x] Medical history from patients.medical_history JSONB
- [x] Last 5 prescriptions: diagnosis, date, doctor
- [x] Last 5 lab reports: test name, status, date
- [x] Last 3 vitals: BP, pulse, SpO2, temperature
- [x] Abnormal values highlighted (BP, SpO2, Temp, Pulse)
- [x] Current appointment: token, type, time

---

### Milestone 2.2: Enhanced OPD Queue

**Modify:** `src/app/doctor/opd/page.tsx`

**Features:**
- [x] Highlight current token being served (larger, different color)
- [x] Show next 3 tokens in queue (smaller, greyed)
- [x] "Next Patient" button (auto-advance)
- [x] "Call Back" button (re-queue patient)
- [x] Consultation time elapsed (e.g., "12 min ago")
- [ ] Patient preview on hover

---

### Milestone 2.3: Vitals Display for Doctor

**Created:** `src/app/api/doctors/patient-history/[patientId]/route.ts`

**Features:**
- [x] Show latest vitals in patient history panel
- [x] Show vitals trend (last 3 records)
- [x] Highlight abnormal values (BP>140/90, SpO2<95%, Temp>100.4F, Pulse>100 or <60)
- [x] Show recorded by (nurse name)

---

## PHASE 3: Token Display Board

### Milestone 3.1: Public Display Page

**Create:**
- `src/app/token-display/page.tsx`
- `src/app/api/token-display/route.ts`

**Features:**
- [ ] No login required
- [ ] Current token per doctor (large font)
- [ ] Patient name + token number
- [ ] Auto-refresh every 10 seconds
- [ ] Audio alert on new token (optional)
- [ ] Queue length per doctor
- [ ] Mobile-responsive
- [ ] Dark mode support

---

## PHASE 4: Patient History Enhancement

### Milestone 4.1: Complete Patient EMR View

**Modify:** `src/app/doctor/patients/[id]/page.tsx`

**Tabs:**
- [ ] Overview: demographics, blood group, allergies, medical history
- [ ] Vitals: all records with charts
- [ ] Prescriptions: all with medicines
- [ ] Lab Reports: all with results
- [ ] Appointments: all past appointments
- [ ] Documents: scanned reports, PDFs

---

### Milestone 4.2: Nurse Vitals Integration

**Modify:** `src/app/nurse/vitals/page.tsx`

**Features:**
- [ ] Show patient's current appointment
- [ ] Auto-fill patient from OPD queue
- [ ] Show previous vitals before recording

---

## PHASE 5: Walk-in Patient Flow

### Milestone 5.1: Unified Patient Lookup

- [ ] Search by phone (most common)
- [ ] Search by name
- [ ] Search by UHID
- [ ] Quick match: phone exists → auto-fill all fields
- [ ] New patient: create with minimal fields

---

### Milestone 5.2: OPD Registration Counter

- [ ] Counter number display
- [ ] Queue management: assign queue position
- [ ] Priority queue for emergency patients
- [ ] Print token slip

---

## PHASE 6: Admin & Super-Admin Integration

### Milestone 6.1: Admin OPD Management

**Create:** `src/app/admin/opd/page.tsx`

**Features:**
- [ ] View all OPD queues
- [ ] View all doctors' queues simultaneously
- [ ] Reassign patients between doctors
- [ ] OPD statistics (patients per doctor, avg wait time)

---

### Milestone 6.2: Super-Admin OPD Dashboard

**Create:** `src/app/super-admin/opd/page.tsx`

**Features:**
- [ ] View all OPD queues hospital-wide
- [ ] Daily/weekly/monthly analytics
- [ ] Doctor performance metrics

---

## API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/reception/patients/search` | GET | Quick patient lookup |
| `/api/reception/book-appointment` | POST | Book appointment with server-side token |
| `/api/reception/today-queue` | GET | Today's OPD queue |
| `/api/appointments/book` | POST | Server-side booking (for patient self-booking too) |
| `/api/doctors/patient-vitals/[patientId]` | GET | Patient vitals for doctor |
| `/api/token-display` | GET | Token display data |

---

## Priority Order & Progress

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | Phase 1: Reception Desk | [x] Done (`cd79698`, `9f332cd`, `37299dc`, `9ca387b`) | 3-4 days |
| 2 | Phase 2: Doctor OPD Enhancement | [x] Done (`1d96f78`, `bbb20d3`) | 2-3 days |
| 3 | Phase 3: Token Display Board | [x] Done (`a95b41f`) | 1-2 days |
| 4 | Phase 4: Patient History | [x] Done (`649daf7`) | 2-3 days |
| 5 | Phase 5: Walk-in Flow | [ ] Pending | 1-2 days |
| 6 | Phase 6: Admin Integration | [ ] Pending | 1-2 days |

**Total estimated effort: 10-16 days**

**Completed:** Phases 1-3 done — Reception desk, doctor OPD queue + history panel + vitals, token display board
