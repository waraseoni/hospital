import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin" && profile.role !== "staff")) {
      return NextResponse.json({ error: "Only staff can book appointments" }, { status: 403 });
    }

    const { patient_id, doctor_id, date_slot, consultation_type, notes } = await request.json();

    if (!patient_id || !doctor_id || !date_slot) {
      return NextResponse.json({ error: "patient_id, doctor_id, and date_slot are required" }, { status: 400 });
    }

    const dateOnly = date_slot.split("T")[0];
    const admin = createAdminClient();

    const { data: lastToken, error: tokenError } = await admin
      .from("appointments")
      .select("token_no")
      .eq("doctor_id", doctor_id)
      .gte("date_slot", `${dateOnly}T00:00`)
      .lte("date_slot", `${dateOnly}T23:59`)
      .order("token_no", { ascending: false })
      .limit(1)
      .single();

    if (tokenError && tokenError.code !== "PGRST116") return NextResponse.json({ error: tokenError.message }, { status: 400 });

    const tokenNo = lastToken ? lastToken.token_no + 1 : 1;

    const { data, error } = await admin.from("appointments").insert({
      patient_id,
      doctor_id,
      date_slot,
      token_no: tokenNo,
      consultation_type: consultation_type || "opd",
      notes: notes || "",
      status: "scheduled",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { data: patient } = await supabase.from("patients").select("name, uhid").eq("id", patient_id).single();

    return NextResponse.json({
      success: true,
      appointment: data,
      token_no: tokenNo,
      patient: patient,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
