export type UserRole = "super_admin" | "admin" | "doctor" | "nurse" | "lab" | "staff" | "patient";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  specialization: string | null;
  qualification: string | null;
  license_number: string | null;
  consultation_fee: number;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  uhid: string;
  name: string;
  dob: string;
  gender: "male" | "female" | "other";
  phone: string;
  address: string;
  blood_group: string | null;
  emergency_contact: string | null;
  allergies: string | null;
  medical_history: Record<string, unknown>[];
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  date_slot: string;
  token_no: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  consultation_type: string;
  notes: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Profile;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  diagnosis: string;
  symptoms: string | null;
  notes: string | null;
  medicines: MedicineItem[];
  follow_up_date: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Profile;
}

export interface MedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface LabReport {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  ordered_by: string | null;
  test_name: string;
  test_category: string;
  test_data: Record<string, string>;
  normal_ranges: Record<string, string>;
  pdf_url: string | null;
  status: "pending" | "in_progress" | "finalized";
  notes: string | null;
  finalized_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export interface Bed {
  id: string;
  ward_name: string;
  bed_number: string;
  bed_type: "general" | "semi_private" | "private" | "icu" | "emergency";
  is_occupied: boolean;
  current_patient_id: string | null;
  daily_rate: number;
  is_ready: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  current_patient?: Patient;
}

export interface Invoice {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  invoice_number: string;
  total_amount: number;
  discount: number;
  tax: number;
  net_amount: number;
  payment_status: "pending" | "paid" | "partial" | "cancelled";
  payment_method: "cash" | "card" | "upi" | "insurance" | null;
  line_items: InvoiceLineItem[];
  notes: string | null;
  pdf_url: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  created_by?: string | null;
  payments?: { amount: number; method: string; paid_at: string }[];
}

export interface InvoiceLineItem {
  description: string;
  category: "opd" | "ipd" | "lab" | "pharmacy" | "other";
  amount: number;
  quantity: number;
}

export interface WhatsAppLog {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_type: "appointment_confirmation" | "appointment_reminder" | "prescription" | "lab_report" | "billing" | "custom";
  message_body: string;
  pdf_link: string | null;
  status: "sent" | "delivered" | "failed" | "pending";
  error_message: string | null;
  external_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface VitalsRecord {
  id: string;
  patient_id: string;
  nurse_id: string;
  bp_systolic: number;
  bp_diastolic: number;
  pulse: number;
  spo2: number;
  temperature: number;
  weight: number | null;
  height: number | null;
  respiratory_rate: number | null;
  pain_scale: number | null;
  notes: string | null;
  recorded_at: string;
  created_at: string;
  patient?: Patient;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minimum_stock: number;
  price_per_unit: number;
  supplier: string | null;
  expiry_date: string | null;
  batch_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: Profile;
}

export interface StockTransaction {
  id: string;
  item_id: string;
  type: "in" | "out";
  quantity: number;
  ref_type: "manual" | "purchase_order" | "dispense" | "requisition" | "pos" | "adjustment";
  ref_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  item?: InventoryItem;
  created_by_profile?: Profile;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  gstin: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  received_qty: number;
  created_at: string;
  item?: InventoryItem;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string | null;
  status: "draft" | "ordered" | "received" | "cancelled";
  total_amount: number;
  notes: string | null;
  ordered_by: string | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface RequisitionItem {
  id: string;
  req_id: string;
  item_id: string;
  quantity: number;
  issued_qty: number;
  created_at: string;
  item?: InventoryItem;
}

export interface Requisition {
  id: string;
  req_number: string;
  department: string;
  requested_by: string | null;
  status: "pending" | "approved" | "issued" | "rejected";
  notes: string | null;
  approved_by: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  requested_by_profile?: Profile;
  items?: RequisitionItem[];
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: "cash" | "card" | "upi" | "insurance" | "other";
  reference: string | null;
  notes: string | null;
  paid_at: string;
  received_by: string | null;
  created_at: string;
  invoice?: Invoice;
}

export interface InsurancePanel {
  id: string;
  code: string;
  name: string;
  contact: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageService {
  description: string;
  category: "opd" | "ipd" | "lab" | "pharmacy" | "other";
  amount: number;
  quantity: number;
}

export interface ServicePackage {
  id: string;
  code: string;
  name: string;
  description: string;
  base_amount: number;
  discount_percent: number;
  panel_id: string | null;
  services: PackageService[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  panel?: InsurancePanel;
}

export interface Claim {
  id: string;
  claim_number: string;
  invoice_id: string;
  panel_id: string | null;
  insurer_code: string;
  policy_no: string | null;
  approval_no: string | null;
  stage: "intimation" | "preauth" | "claim" | "settled" | "rejected";
  status: "draft" | "submitted" | "approved" | "paid" | "rejected";
  amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invoice?: Invoice;
  panel?: InsurancePanel;
}

export interface Attendance {
  id: string;
  staff_id: string;
  work_date: string;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  check_in: string | null;
  check_out: string | null;
  notes: string | null;
  marked_by: string | null;
  created_at: string;
  updated_at: string;
  staff?: Profile;
}

export interface Leave {
  id: string;
  staff_id: string;
  leave_type: "sick" | "casual" | "earned" | "maternity" | "unpaid" | "other";
  from_date: string;
  to_date: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_by: string | null;
  approval_notes: string | null;
  created_at: string;
  updated_at: string;
  staff?: Profile;
}

export interface Roster {
  id: string;
  staff_id: string;
  roster_date: string;
  shift: "morning" | "evening" | "night" | "general";
  department: string;
  notes: string | null;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  staff?: Profile;
}

export interface HousekeepingTask {
  id: string;
  bed_id: string | null;
  room_label: string;
  task_type: "deep" | "regular" | "discharge" | "spill";
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to: string | null;
  notes: string | null;
  requested_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  bed?: Bed;
  assigned_to_profile?: Profile;
}

export interface Equipment {
  id: string;
  name: string;
  category: string;
  department: string;
  asset_tag: string | null;
  manufacturer: string;
  model: string;
  serial_number: string;
  purchase_date: string | null;
  purchase_cost: number;
  warranty_until: string | null;
  location: string;
  status: "operational" | "maintenance" | "repair" | "retired" | "reserved";
  notes: string | null;
  last_service_at: string | null;
  next_service_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLog {
  id: string;
  equipment_id: string;
  maintenance_type: "service" | "repair" | "calibration" | "inspection";
  description: string;
  cost: number;
  performed_by: string;
  performed_at: string;
  next_due: string | null;
  created_by: string | null;
  created_at: string;
  equipment?: Equipment;
}

export interface Ambulance {
  id: string;
  vehicle_no: string;
  ambulance_type: "BLS" | "ALS" | "patient_transport" | "neonatal";
  driver_name: string;
  driver_phone: string;
  status: "available" | "on_trip" | "maintenance" | "offline";
  base_location: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AmbulanceCall {
  id: string;
  call_number: string;
  patient_id: string | null;
  patient_name: string;
  patient_phone: string;
  pickup_address: string;
  drop_address: string;
  condition_notes: string;
  trip_type: "emergency" | "transfer" | "discharge" | "routine";
  status: "received" | "assigned" | "en_route" | "arrived" | "completed" | "cancelled";
  ambulance_id: string | null;
  assigned_by: string | null;
  started_at: string | null;
  arrived_at: string | null;
  completed_at: string | null;
  distance_km: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  ambulance?: Ambulance;
  patient?: Patient;
}

export interface BloodDonation {
  id: string;
  donor_name: string;
  donor_phone: string | null;
  donor_age: number | null;
  donor_gender: string | null;
  blood_group: string;
  volume_ml: number;
  collected_at: string;
  screened: boolean;
  screening_notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BloodUnit {
  id: string;
  donation_id: string | null;
  blood_group: string;
  component: "whole" | "prbc" | "ffp" | "platelets" | "cryo" | "plasma";
  unit_code: string;
  volume_ml: number;
  expiry_date: string;
  status: "available" | "reserved" | "issued" | "expired" | "discarded" | "quarantined";
  location: string;
  reserved_for: string | null;
  issued_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BloodRequest {
  id: string;
  request_number: string;
  patient_id: string | null;
  patient_name: string;
  blood_group: string;
  component: "whole" | "prbc" | "ffp" | "platelets" | "cryo" | "plasma";
  quantity: number;
  urgency: "routine" | "urgent" | "emergency";
  requested_by: string | null;
  department: string;
  status: "pending" | "approved" | "issued" | "rejected" | "cancelled";
  crossmatch: "compatible" | "incompatible" | "pending";
  notes: string | null;
  issued_unit_ids: string[];
  approved_by: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
}

export interface Feedback {
  id: string;
  patient_id: string;
  rating: number;
  category: "general" | "opd" | "ipd" | "lab" | "pharmacy" | "billing" | "facility" | "staff" | "other";
  comments: string | null;
  status: "new" | "acknowledged" | "resolved";
  created_at: string;
  patient?: Patient;
}

export interface PatientDocument {
  id: string;
  patient_id: string;
  title: string;
  category: "prescription" | "lab_report" | "invoice" | "scan" | "other";
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}
