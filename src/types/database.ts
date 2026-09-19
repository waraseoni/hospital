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
