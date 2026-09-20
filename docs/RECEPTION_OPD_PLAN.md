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

**Features:**
- [ ] Quick patient search (by phone, name, or UHID)
- [ ] Search results: name, UHID, phone, last visit
- [ ] "New Patient" button → quick registration form
- [ ] Form: name, phone, DOB, gender, address, blood group, allergies
- [ ] Auto UHID generation (reuse generateUHID())
- [ ] Duplicate check by phone before creating
- [ ] Walk-in patients (no user_id) supported
- [ ] After registration, auto-select for booking

---

### Milestone 1.2: Appointment Booking from Reception

**Create:**
- `src/app/api/reception/book-appointment/route.ts`

**Features:**
- [ ] Doctor dropdown (all doctors with specialization)
- [ ] Date (today default, future dates allowed)
- [ ] Consultation type (opd/emergency/follow_up)
- [ ] Notes field (optional)
- [ ] Auto token number (server-side with locking)
- [ ] Token slip: token #, patient name, doctor, date, queue position, UHID

---

### Milestone 1.3: Today's Queue View

**Create:**
- `src/app/api/reception/today-queue/route.ts`

**Features:**
- [ ] Appointments grouped by doctor
- [ ] Each section: doctor name, specialization, queue count, current token
- [ ] Each appointment: token #, patient name, UHID, status badge, time
- [ ] Cancel appointment (with confirmation)
- [ ] Auto-refresh every 30 seconds

---

### Milestone 1.4: Server-side Token Generation

**Create:**
- `src/app/api/appointments/book/route.ts`

**Modify:**
- `src/app/patient/appointments/page.tsx` — Use new API

**Features:**
- [ ] Database-level locking for token generation
- [ ] Atomic insert with retry for UNIQUE constraint
- [ ] Return generated token number

---

## PHASE 2: Doctor OPD Enhancement

### Milestone 2.1: Patient History Panel

**Modify:** `src/app/doctor/opd/page.tsx`

**Features (shown when Start Consultation clicked):**
- [ ] Profile: name, age, gender, phone, UHID, blood group, allergies
- [ ] Medical history from patients.medical_history JSONB
- [ ] Last 5 prescriptions: diagnosis, date, doctor
- [ ] Last 5 lab reports: test name, status, date
- [ ] Last 3 vitals: BP, pulse, SpO2, temperature
- [ ] Current appointment: token, type, time

---

### Milestone 2.2: Enhanced OPD Queue

**Modify:** `src/app/doctor/opd/page.tsx`

**Features:**
- [ ] Highlight current token (large, colored)
- [ ] Show next 3 tokens (smaller, greyed)
- [ ] "Next Patient" button (auto-advance)
- [ ] "Call Back" button (re-queue patient)
- [ ] Consultation time elapsed
- [ ] Patient preview on hover

---

### Milestone 2.3: Vitals Display for Doctor

**Create:** `src/app/api/doctors/patient-vitals/[patientId]/route.ts`

**Modify:** `src/app/doctor/opd/page.tsx`

**Features:**
- [ ] Show latest vitals in patient panel
- [ ] Vitals trend (last 5 records)
- [ ] Highlight abnormal values (BP>140/90, SpO2<95%, Temp>100.4F)
- [ ] Show recorded by (nurse name)

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

## Priority Order

| # | Phase | Priority | Estimated Effort |
|---|-------|----------|------------------|
| 1 | Phase 1: Reception Desk | **P0 — Critical** | 3-4 days |
| 2 | Phase 2: Doctor OPD Enhancement | **P0 — Critical** | 2-3 days |
| 3 | Phase 3: Token Display Board | **P1 — Important** | 1-2 days |
| 4 | Phase 4: Patient History | **P1 — Important** | 2-3 days |
| 5 | Phase 5: Walk-in Flow | **P2 — Nice to have** | 1-2 days |
| 6 | Phase 6: Admin Integration | **P2 — Nice to have** | 1-2 days |

**Total estimated effort: 10-16 days**
