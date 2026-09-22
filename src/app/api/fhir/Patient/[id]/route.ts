import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFhirAuth } from "@/lib/fhir/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFhirAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const admin = createAdminClient();

    const { data: patient, error } = await admin
      .from("patients")
      .select(
        "id, uhid, name, dob, gender, phone, address, blood_group, allergies, emergency_contact, medical_history, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (error || !patient) {
      return NextResponse.json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found", diagnostics: "Patient not found" }] }, { status: 404 });
    }

    // FHIR R4 Patient resource
    const fhir: Record<string, unknown> = {
      resourceType: "Patient",
      id: patient.id,
      meta: {
        lastUpdated: patient.updated_at,
        profile: ["http://hl7.org/fhir/StructureDefinition/Patient"],
      },
      identifier: [
        { system: "urn:oid:1.2.3.4.5.6.7.8.9.10", value: patient.uhid },
      ],
      active: true,
      name: [{ use: "official", text: patient.name, family: patient.name.split(" ").slice(-1)[0] }],
      gender: patient.gender && patient.gender !== "other" ? patient.gender : "unknown",
      birthDate: patient.dob,
      telecom: [{ system: "phone", value: patient.phone, use: "mobile" }],
    };

    if (patient.address) {
      fhir.address = [{ use: "home", text: patient.address }];
    }

    if (patient.blood_group) {
      fhir.extension = [{ url: "http://hl7.org/fhir/StructureDefinition/patient-birthPlace", valueString: patient.blood_group }];
    }

    if (patient.allergies) {
      fhir.extension = [...(Array.isArray(fhir.extension) ? fhir.extension : []), { url: "http://hl7.org/fhir/StructureDefinition/patient-citizenship", valueString: patient.allergies }];
    }

    if (patient.emergency_contact) {
      fhir.contact = [{ relationship: [{ coding: [{ system: "http://hl7.org/fhir/valuesset/patient-contact-relationship", code: "emergency" }] }], name: { text: "Emergency Contact" }, telecom: [{ system: "phone", value: patient.emergency_contact }] }];
    }

    return NextResponse.json(fhir);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}