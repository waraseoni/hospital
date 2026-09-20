import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin" && profile.role !== "staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patient:patients(id, name, uhid, phone, gender, blood_group),
        doctor:profiles(id, full_name, specialization)
      `)
      .gte("date_slot", `${today}T00:00`)
      .lte("date_slot", `${today}T23:59`)
      .order("doctor_id")
      .order("token_no", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    interface Apt {
      id: string;
      patient_id: string;
      doctor_id: string;
      patient: { id: string; name: string; uhid: string; phone: string; gender: string; blood_group: string } | null;
      doctor: { id: string; full_name: string; specialization: string } | null;
      token_no: number;
      status: string;
      date_slot: string;
      consultation_type: string;
    }

    interface DoctorQueue {
      doctor: { full_name: string; specialization: string } | null;
      total: number;
      current: number | null;
      appointments: Apt[];
    }

    const grouped: Record<string, DoctorQueue> = {};

    (data || []).forEach((apt: Apt) => {
      const key = apt.doctor_id;
      if (!grouped[key]) {
        grouped[key] = { doctor: apt.doctor, total: 0, current: null, appointments: [] };
      }
      grouped[key].appointments.push(apt);
      grouped[key].total++;
      if (apt.status === "in_progress") grouped[key].current = apt.token_no;
    });

    return NextResponse.json({
      date: today,
      doctors: Object.values(grouped)
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
