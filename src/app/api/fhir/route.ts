import { NextRequest, NextResponse } from "next/server";
import { requireFhirAuth } from "@/lib/fhir/auth";

export async function GET(request: NextRequest) {
  const auth = await requireFhirAuth(request);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    resourceType: "CapabilityStatement",
    status: "active",
    date: new Date().toISOString().slice(0, 10),
    kind: "instance",
    fhirVersion: "4.0.1",
    format: ["json"],
    rest: [
      {
        mode: "server",
        resource: [
          { type: "Patient", interaction: [{ code: "read" }] },
          { type: "MedicationRequest", interaction: [{ code: "read" }] },
          { type: "DiagnosticReport", interaction: [{ code: "read" }] },
          { type: "Observation", interaction: [{ code: "read" }] },
        ],
      },
    ],
  });
}