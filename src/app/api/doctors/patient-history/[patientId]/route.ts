import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { patientId } = await params;

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const [prescriptionsResult, labReportsResult, vitalsResult] = await Promise.all([
      supabase.from("prescriptions").select("*, doctor:profiles(full_name)").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(5),
      supabase.from("lab_reports").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(5),
      supabase.from("vitals_records").select("*, nurse:profiles(full_name)").eq("patient_id", patientId).order("recorded_at", { ascending: false }).limit(3),
    ]);

    return NextResponse.json({
      patient,
      prescriptions: prescriptionsResult.data || [],
      labReports: labReportsResult.data || [],
      vitals: vitalsResult.data || [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
