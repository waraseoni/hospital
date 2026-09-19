# HMS Complete UX/UI Implementation Plan
## Version: 0.3.0.0 Target
## Focus: Best User Experience, Mobile+PC Friendly, Interconnected Workflows

---

## PART 1: SHARED COMPONENT LIBRARY (Build First)
Ye sabse pehle banana padega — har page pe use hoga

### 1.1 UI Primitives
| Component | Purpose | Priority |
|-----------|---------|----------|
| Button | Primary, secondary, destructive, ghost + loading state | P0 |
| Badge | Status badges (occupied/available, paid/unpaid, etc.) | P0 |
| Card | Stat cards, content cards, action cards | P0 |
| Input | Text, number, date, search — with label, error, helper text | P0 |
| Select | Dropdown with search/filter | P0 |
| Modal | Confirmation dialogs (replace window.confirm) | P0 |
| Toast | Success/error/info notifications (replace alert()) | P0 |
| Skeleton | Loading skeletons for tables, cards, pages | P1 |
| EmptyState | No data illustrations with action buttons | P1 |
| Avatar | User avatar with fallback initials | P1 |
| Tabs | Tab navigation (Pending/In Progress/Finalized) | P1 |
| Pagination | Page navigation for tables | P1 |
| Breadcrumb | Page navigation trail | P2 |

### 1.2 Data Display
| Component | Purpose | Priority |
|-----------|---------|----------|
| DataTable | Sortable, filterable, paginated table with column config | P0 |
| StatCard | Icon + value + label + trend indicator | P0 |
| SearchBar | Debounced search input with filter chips | P0 |
| StatusBadge | Colored badge for any status field | P0 |
| Timeline | Chronological event list (audit logs, vitals history) | P1 |

### 1.3 Forms
| Component | Purpose | Priority |
|-----------|---------|----------|
| Form | Form wrapper with validation, submit handling | P0 |
| FormField | Label + input + error message combo | P0 |
| DynamicList | Add/remove rows (medicines, line items) | P0 |
| DatePicker | Date + time picker (mobile-friendly) | P0 |
| PatientSelect | Searchable patient dropdown with UHID | P0 |
| DoctorSelect | Searchable doctor dropdown with specialization | P0 |

### 1.4 Layout
| Component | Purpose | Priority |
|-----------|---------|----------|
| PageHeader | Title + subtitle + action buttons area | P0 |
| PageContainer | Consistent page padding + max-width | P0 |
| ResponsiveGrid | Auto-layout grid (1-col mobile, 2-3 col desktop) | P0 |
| SlidePanel | Side panel for forms (desktop) / full screen (mobile) | P1 |

---

## PART 2: PER-PAGE DETAILED PLANS

### 2.1 LANDING PAGE (/)
**Current:** Basic hero + 6 role cards
**New Features:** Hospital logo, feature highlights, version badge, footer, cards link to role info

### 2.2 LOGIN (/login)
**Current:** Email/password form
**New Features:** Login attempt counter, rate limit feedback, loading skeleton, smooth redirect

### 2.3 ADMIN DASHBOARD (/admin)
**Current:** 5 basic stat cards
**New Features:** Alerts panel (low stock/dirty beds/unpaid), weekly revenue chart, bed occupancy ring, today's appointments, quick action buttons, activity feed

### 2.4 ADMIN STAFF (/admin/staff)
**Current:** Basic table + inline form
**New Features:** Search/filter by role, pagination, slide-out form, avatar, confirmation modal, toast notifications, specialization in table

### 2.5 ADMIN PATIENTS (/admin/patients)
**Current:** Basic table + form (UHID not auto-generated)
**New Features:** FIX UHID auto-gen, blood group, emergency contact, allergies/medical history, age from DOB, search/filter, patient detail view, pagination

### 2.6 ADMIN BEDS (/admin/beds)
**Current:** Basic table
**New Features:** Visual bed grid (colored cards), ward grouping, stats bar, filter by ward/type/status, click bed for patient details, batch creation

### 2.7 ADMIN INVENTORY (/admin/inventory)
**Current:** BROKEN (wrong table name)
**New Features:** FIX table name, low stock alerts, category filter, expiry tracking, supplier, batch number, stock history, reorder suggestions

### 2.8 ADMIN AUDIT (/admin/audit)
**Current:** Basic table, 100 entries
**New Features:** Date range filter, action/table filter, search, pagination, detail view (JSON), export CSV

### 2.9 DOCTOR DASHBOARD (/doctor)
**Current:** 2 stat cards + OPD link
**New Features:** Next appointment highlight, today's summary, recent prescriptions, quick links

### 2.10 DOCTOR OPD QUEUE (/doctor/opd)
**Current:** Basic appointment list
**New Features:** Tab filtering, vitals preview, view history, time sorting, color-coded cards, mobile swipe actions

### 2.11 DOCTOR PATIENTS (/doctor/patients)
**Current:** Basic search + table
**New Features:** Last visit date, age from DOB, click for EMR, sort, pagination

### 2.12 DOCTOR PATIENT EMR (/doctor/patients/[id])
**Current:** Basic Rx + lab history
**New Features:** Patient header with demographics, allergies, tabbed view (Vitals/Rx/Labs/Appointments), vitals table, quick actions

### 2.13 DOCTOR NEW PRESCRIPTION (/doctor/prescriptions/new)
**Current:** Basic form
**New Features:** Current vitals display, follow-up date, order lab test, WhatsApp send, medicine autocomplete, PDF preview

### 2.14 NURSE DASHBOARD (/nurse)
**Current:** 2 stat cards (wrong heading)
**New Features:** FIX "Welcome, Nurse", pending vitals count, ward bed summary, next patients, quick actions

### 2.15 NURSE VITALS (/nurse/vitals)
**Current:** Basic form + table
**New Features:** Patient search with UHID, abnormal value highlighting, delete modal, vitals trend, success toast

### 2.16 NURSE BEDS (/nurse/beds)
**Current:** Basic toggle cards
**New Features:** FIX patient assignment, patient search on allot, ward grouping, filters, last cleaned timestamp

### 2.17 LAB DASHBOARD (/lab)
**Current:** 2 stat cards
**New Features:** Today's summary, recent tests, quick link to queue

### 2.18 LAB QUEUE (/lab/queue)
**Current:** Tabbed queue
**New Features:** Doctor name, order date/time, patient UHID, tab counts, delete modal

### 2.19 PATIENT DASHBOARD (/patient)
**Current:** 3 stat cards (wrong heading)
**New Features:** FIX heading, next appointment, latest Rx preview, pending balance, UPI payment, quick actions

### 2.20 PATIENT APPOINTMENTS (/patient/appointments)
**Current:** Basic booking + list
**New Features:** Doctor specialization, appointment type tabs, rate doctor, reschedule, availability indicator

### 2.21 PATIENT PRESCRIPTIONS (/patient/prescriptions)
**Current:** Basic list
**New Features:** Search by diagnosis/doctor, date filter, PDF download, WhatsApp send

### 2.22 PATIENT REPORTS (/patient/reports)
**Current:** Basic list
**New Features:** Pending reports visible, doctor name, detail view, search

### 2.23 PATIENT BILLING (/patient/billing)
**Current:** Basic list
**New Features:** Outstanding/paid summary, UPI QR code, payment receipt, detail view

### 2.24 STAFF DASHBOARD (/staff)
**Current:** Invoice creation + stats (wrong heading)
**New Features:** FIX heading, dirty beds alert, recent invoices, quick actions, invoice PDF trigger

### 2.25 STAFF ROOMS (/staff/rooms)
**Current:** Basic toggle cards
**New Features:** Ward grouping, last cleaned timestamp, assigned staff, priority indicators

---

## PART 3: PAGE INTERCONNECTIONS

### Data Flow Map
```
Patient Created (Admin)
  → Appears in Doctor Patient List
  → Appears in Nurse Patient Selector
  → Can Book Appointment (Patient)
  → Can be Assigned Bed (Nurse)

Appointment Booked (Patient)
  → Appears in Doctor OPD Queue
  → Token Number Generated
  → Doctor Starts Consultation
  → Doctor Writes Prescription
  → Prescription PDF Generated
  → WhatsApp Sent to Patient

Prescription Created (Doctor)
  → PDF Generated
  → WhatsApp Sent to Patient
  → Appears in Patient Prescription List
  → Medicine dispensed (Pharmacy - future)

Lab Test Ordered (Doctor)
  → Appears in Lab Queue
  → Lab Tech Enters Results
  → Report Finalized
  → PDF Generated
  → WhatsApp Sent to Patient
  → Appears in Patient Reports

Vitals Recorded (Nurse)
  → Available in Doctor EMR View
  → Available in Prescription Form (current vitals)

Bed Allotted (Nurse)
  → Bed status updated
  → Patient linked to bed
  → Appears in Bed Management

Invoice Created (Staff)
  → PDF Generated
  → WhatsApp Sent to Patient
  → Appears in Patient Billing
  → UPI Payment (Patient)
  → Receipt Generated
```

### Cross-Page Navigation
```
Admin Dashboard
  → [+Patient] → /admin/patients (open form)
  → [+Staff] → /admin/staff (open form)
  → [+Bed] → /admin/beds (open form)
  → [Audit Logs] → /admin/audit
  → [Low Stock Alert] → /admin/inventory (filtered)
  → [Dirty Beds Alert] → /nurse/beds
  → [Unpaid Invoices] → /staff (filtered)

Doctor Dashboard
  → [OPD Queue] → /doctor/opd
  → [Patient List] → /doctor/patients
  → [New Rx] → /doctor/prescriptions/new

Doctor OPD
  → [Start Consultation] → shows vitals form inline
  → [Write Rx] → /doctor/prescriptions/new?patient=X&appointment=Y
  → [View History] → /doctor/patients/[id]

Doctor EMR
  → [New Prescription] → /doctor/prescriptions/new?patient=X
  → [Order Lab Test] → creates lab report in queue

Patient Dashboard
  → [Book Appointment] → /patient/appointments
  → [View Prescriptions] → /patient/prescriptions
  → [View Reports] → /patient/reports
  → [Pay Bill] → /patient/billing (UPI QR)
```

---

## PART 4: MOBILE-FIRST DESIGN RULES

### Layout Strategy
- **Mobile (< 640px):** Single column, full width, stacked cards, bottom nav or hamburger
- **Tablet (640-1024px):** 2-column grid, collapsible sidebar
- **Desktop (> 1024px):** Sidebar + content area, 3-column grids possible

### Mobile-Specific UX
1. **Tables** → Convert to card list on mobile (each row becomes a card)
2. **Forms** → Full-screen modal on mobile, slide-panel on desktop
3. **Actions** → Swipe gestures for common actions (complete, delete)
4. **Navigation** → Bottom tab bar for most-used pages, hamburger for rest
5. **Search** → Full-width sticky search bar at top
6. **FAB** → Floating action button for primary action (Add, Book, Record)
7. **Touch targets** → Minimum 44px for buttons/links
8. **Input** → Use appropriate keyboard types (tel, email, number, text)

### Responsive Patterns
```
StatCards:     mobile=2col  tablet=3col  desktop=5col
DataTable:     mobile=cards tablet=table  desktop=table
Form:          mobile=full  tablet=slide  desktop=slide
Grid:          mobile=1col  tablet=2col  desktop=3col
Nav:           mobile=pills tablet=side   desktop=side
```

---

## PART 5: IMPLEMENTATION PRIORITY (Phase-wise)

### Phase 0.3.0 — Foundation Fixes + Shared Components (Week 1-2)
**CRITICAL BUGS:**
- [ ] Fix inventory API table name (inventory → inventory_items)
- [ ] Fix UHID auto-generation on patient create
- [ ] Fix nurse bed allotment (assign patient)
- [ ] Fix wrong dashboard headings (Nurse, Patient, Staff)

**SHARED COMPONENTS (P0):**
- [ ] Button component (all variants)
- [ ] Card + StatCard component
- [ ] Input + Select + FormField
- [ ] Modal (replace window.confirm)
- [ ] Toast (replace alert())
- [ ] Badge/StatusBadge
- [ ] DataTable with sort/filter/pagination
- [ ] PageHeader + PageContainer
- [ ] Skeleton loaders
- [ ] EmptyState

### Phase 0.4.0 — Core Workflow Integration (Week 3-4)
**PDF + WHATSAPP WIRING:**
- [ ] Prescription save → PDF generate → WhatsApp send
- [ ] Lab report finalize → PDF generate → WhatsApp send
- [ ] Invoice create → PDF generate → WhatsApp send
- [ ] Hospital settings (name, address, phone) for PDFs

**DASHBOARD UPGRADES:**
- [ ] Admin: Alerts panel, activity feed, quick actions
- [ ] Doctor: Next appointment, today's summary
- [ ] Nurse: Pending vitals, ward summary
- [ ] Patient: Next appointment, pending balance
- [ ] Lab: Recent tests, quick links

### Phase 0.5.0 — Enhanced Pages (Week 5-6)
**ADMIN PAGES:**
- [ ] Staff: Search/filter, pagination, slide-out form
- [ ] Patients: Blood group, emergency contact, search, detail view
- [ ] Beds: Visual grid, ward grouping, batch creation
- [ ] Inventory: Low stock alerts, expiry tracking, stock history
- [ ] Audit: Date/action filters, detail view, export

**DOCTOR PAGES:**
- [ ] OPD: Tab filtering, vitals preview, color-coded cards
- [ ] Patients: Last visit, sort, pagination
- [ ] EMR: Tabbed view, vitals history, quick actions
- [ ] Prescription: Vitals display, follow-up date, lab ordering

**NURSE PAGES:**
- [ ] Vitals: Abnormal highlighting, patient search, trends
- [ ] Beds: Patient assignment, ward grouping, filters

**PATIENT PAGES:**
- [ ] Appointments: Tabs, rate doctor, reschedule
- [ ] Prescriptions: Search, date filter
- [ ] Reports: Pending visibility, detail view
- [ ] Billing: UPI payment, summary cards

### Phase 0.6.0 — Settings + Polish (Week 7-8)
**SETTINGS:**
- [ ] Hospital profile (name, logo, address, phone, email)
- [ ] Used in PDFs, WhatsApp messages, landing page
- [ ] Admin can edit settings

**POLISH:**
- [ ] Loading skeletons on all pages
- [ ] Error boundaries
- [ ] Empty state illustrations
- [ ] Responsive testing (all pages)
- [ ] i18n coverage (all remaining strings)
- [ ] Dark mode testing (all pages)

### Phase 0.7.0 — Advanced Features (Week 9-12)
**CLINICAL:**
- [ ] Doctor schedule & slot booking
- [ ] IPD admission/discharge
- [ ] Progress notes / case sheet
- [ ] Medical certificates
- [ ] Vaccination records

**PHARMACY:**
- [ ] Pharmacy dispensing
- [ ] Purchase orders
- [ ] Expiry/batch tracking

**BILLING:**
- [ ] Receipt printing
- [ ] Discount policies
- [ ] Insurance/TPA claims
- [ ] Partial payments

**REPORTING:**
- [ ] Revenue reports
- [ ] Doctor-wise collections
- [ ] Inventory valuation
- [ ] Daily/monthly MIS
- [ ] CSV/Excel export

### Phase 0.8.0 — Patient Experience (Week 13-16)
- [ ] Appointment reminders (WhatsApp)
- [ ] File upload (reports, images)
- [ ] Vitals history charts
- [ ] Feedback survey
- [ ] Profile management
- [ ] PWA/offline mode
- [ ] Telegram Bot backup
