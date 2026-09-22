import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface VerifyRow {
  id: string;
  created_at: string;
  diagnosis: string;
  symptoms: string | null;
  medicines: unknown;
  pdf_url: string | null;
  signature_url: string | null;
  patient: { name: string; uhid: string } | null;
  doctor: { full_name: string; specialization: string | null; license_number: string | null } | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const admin = createAdminClient();
    const { data: raw } = await admin
      .from("prescriptions")
      .select(
        "id, created_at, diagnosis, symptoms, medicines, pdf_url, signature_url, patient:patients(name, uhid), doctor:profiles(full_name, specialization, license_number)"
      )
      .eq("id", id)
      .single();

    const prescription = (raw as unknown as VerifyRow | null) ?? null;

    if (!prescription) {
      return NextResponse.json(
        { verified: false, message: "Prescription not found" },
        { status: 404 }
      );
    }

    const qrPayload = {
      verified: true,
      prescription_id: prescription.id,
      issued_at: prescription.created_at,
      patient_name: prescription.patient?.name,
      uhid: prescription.patient?.uhid,
      doctor_name: prescription.doctor?.full_name,
      doctor_specialization: prescription.doctor?.specialization || null,
      license_number: prescription.doctor?.license_number || null,
      diagnosis: prescription.diagnosis,
      symptoms: prescription.symptoms || null,
      has_signature: Boolean(prescription.signature_url || prescription.doctor?.license_number),
      pdf_url: prescription.pdf_url,
      hospital_name: "Hospital Management System",
    };

    const { data: settings } = await admin.from("settings").select("hospital_name").limit(1).single();
    if (settings?.hospital_name) {
      qrPayload.hospital_name = settings.hospital_name;
    }

    return NextResponse.json(qrPayload);
  } catch {
    return NextResponse.json({ verified: false, message: "Invalid request" }, { status: 400 });
  }
}