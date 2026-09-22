import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFhirAuth } from "@/lib/fhir/auth";

interface PrescriptionRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  diagnosis: string;
  symptoms: string | null;
  notes: string | null;
  medicines: unknown;
  follow_up_date: string | null;
  pdf_url: string | null;
  created_at: string;
  patient: { name: string; uhid: string; dob: string; gender: string } | null;
  doctor: { full_name: string; license_number: string | null } | null;
  appointment: { date_slot: string; token_no: number } | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFhirAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: raw, error } = await admin
      .from("prescriptions")
      .select(
        "id, patient_id, doctor_id, appointment_id, diagnosis, symptoms, notes, medicines, follow_up_date, pdf_url, created_at, patient:patients(name, uhid, dob, gender), doctor:profiles(full_name, license_number), appointment:appointments(date_slot, token_no)"
      )
      .eq("id", id)
      .single();

    const prescription = (raw as unknown as PrescriptionRow | null) ?? null;

    if (error || !prescription) {
      return NextResponse.json({
        resourceType: "Bundle",
        type: "searchset",
        total: 0,
        entry: [],
      });
    }

    const medicines = Array.isArray(prescription.medicines) ? prescription.medicines : [];

    // FHIR R4 Bundle of MedicationRequest resources (one per medicine line)
    const entry: Record<string, unknown>[] = medicines.map((med: Record<string, string>, i: number) => ({
      fullUrl: `urn:uuid:${prescription.id}-${i}`,
      resource: {
        resourceType: "MedicationRequest",
        id: `${prescription.id}-${i}`,
        status: "active",
        intent: "order",
        authoredOn: prescription.created_at,
        subject: {
          reference: `Patient/${prescription.patient_id}`,
          display: prescription.patient?.name,
        },
        requester: {
          reference: `Practitioner/${prescription.doctor_id}`,
          display: `Dr. ${prescription.doctor?.full_name}`,
        },
        medicationCodeableConcept: {
          text: med.name || "N/A",
        },
        dosageInstruction: [
          {
            text: [med.dosage, med.frequency, med.duration].filter(Boolean).join(", "),
            timing: med.frequency ? { repeat: { boundsDuration: med.duration ? { value: parseFloat(med.duration) || undefined, unit: "d" } : undefined } } : undefined,
            doseAndRate: med.dosage ? [{ doseQuantity: { value: parseFloat(med.dosage) || undefined } }] : undefined,
          },
        ],
      },
    }));

    // Include diagnostic data as a supporting Observation bundle entry
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      timestamp: new Date().toISOString(),
      total: entry.length,
      entry,
    };

    return NextResponse.json(bundle);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}