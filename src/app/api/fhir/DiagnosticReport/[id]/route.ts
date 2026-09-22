import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireFhirAuth } from "@/lib/fhir/auth";

interface LabRow {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  test_name: string;
  test_category: string;
  test_data: unknown;
  normal_ranges: unknown;
  status: string;
  notes: string | null;
  pdf_url: string | null;
  finalized_at: string | null;
  created_at: string;
  patient: { name: string; uhid: string; dob: string; gender: string } | null;
  doctor: { full_name: string } | null;
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
      .from("lab_reports")
      .select(
        "id, patient_id, doctor_id, test_name, test_category, test_data, normal_ranges, status, notes, pdf_url, finalized_at, created_at, patient:patients(name, uhid, dob, gender), doctor:profiles(full_name)"
      )
      .eq("id", id)
      .single();

    const report = (raw as unknown as LabRow | null) ?? null;

    if (error || !report) {
      return NextResponse.json({ resourceType: "OperationOutcome", issue: [{ severity: "error", code: "not-found", diagnostics: "DiagnosticReport not found" }] }, { status: 404 });
    }

    const statusMap: Record<string, string> = {
      pending: "registered",
      in_progress: "partial",
      finalized: "final",
    };

    // FHIR R4 DiagnosticReport
    const reportResource: Record<string, unknown> = {
      resourceType: "DiagnosticReport",
      id: report.id,
      status: statusMap[report.status] || "unknown",
      code: {
        coding: [{ system: "http://loinc.org", code: report.test_name || "LAB", display: report.test_name }],
        text: report.test_name,
      },
      subject: {
        reference: `Patient/${report.patient_id}`,
        display: report.patient?.name,
      },
      issued: report.finalized_at || report.created_at,
      performer: report.doctor_id ? [{ reference: `Practitioner/${report.doctor_id}`, display: `Dr. ${report.doctor?.full_name}` }] : undefined,
      conclusion: report.notes || undefined,
      presentedForm: report.pdf_url ? [{ url: report.pdf_url, title: `Lab Report ${report.test_name}` }] : undefined,
    };

    // Observation entries per test parameter
    const testData = (report.test_data || {}) as Record<string, string>;
    const normalRanges = (report.normal_ranges || {}) as Record<string, string>;
    const observations = Object.entries(testData).map(([key, value]) => ({
      resourceType: "Observation",
      status: report.finalized_at ? "final" : "preliminary",
      code: { text: key },
      valueString: String(value),
      referenceRange: normalRanges[key] ? [{ text: normalRanges[key] }] : undefined,
      subject: { reference: `Patient/${report.patient_id}` },
    }));

    // Return Bundle with DiagnosticReport + Observations
    const bundle = {
      resourceType: "Bundle",
      type: "collection",
      timestamp: new Date().toISOString(),
      total: observations.length + 1,
      entry: [
        { resource: reportResource },
        ...observations.map((obs, i) => ({ fullUrl: `urn:uuid:${report.id}-obs-${i}`, resource: obs })),
      ],
    };

    return NextResponse.json(bundle);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}