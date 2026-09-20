import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const supabase = await createClient();
    const { patientId } = await params;

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [prescriptionsResult, labReportsResult, vitalsResult, appointmentsResult] = await Promise.all([
      supabase.from("prescriptions").select("*, doctor:profiles(full_name, specialization)").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(10),
      supabase.from("lab_reports").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(10),
      supabase.from("vitals_records").select("*, nurse:profiles(full_name)").eq("patient_id", patientId).order("recorded_at", { ascending: false }).limit(10),
      supabase.from("appointments").select("*, doctor:profiles(full_name, specialization)").eq("patient_id", patientId).order("date_slot", { ascending: false }).limit(10),
    ]);

    const prescriptions = (prescriptionsResult.data || []).map((p: Record<string, unknown>) => ({
      ...p,
      doctor_name: (p.doctor as { full_name?: string } | null)?.full_name,
      doctor_specialization: (p.doctor as { specialization?: string } | null)?.specialization,
      doctor: undefined,
    }));

    const appointments = (appointmentsResult.data || []).map((a: Record<string, unknown>) => ({
      ...a,
      doctor_name: (a.doctor as { full_name?: string } | null)?.full_name,
      doctor_specialization: (a.doctor as { specialization?: string } | null)?.specialization,
      doctor: undefined,
    }));

    const vitals = (vitalsResult.data || []).map((v: Record<string, unknown>) => ({
      ...v,
      nurse_name: (v.nurse as { full_name?: string } | null)?.full_name,
      nurse: undefined,
    }));

    return NextResponse.json({
      patient,
      prescriptions,
      labReports: labReportsResult.data || [],
      vitals,
      appointments,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
