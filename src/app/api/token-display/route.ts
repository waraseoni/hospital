import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patient:patients(id, name, uhid),
        doctor:profiles(id, full_name, specialization)
      `)
      .gte("date_slot", `${today}T00:00`)
      .lte("date_slot", `${today}T23:59`)
      .in("status", ["scheduled", "in_progress"])
      .order("doctor_id")
      .order("token_no", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    interface Apt {
      id: string;
      doctor_id: string;
      patient: { id: string; name: string; uhid: string } | null;
      doctor: { id: string; full_name: string; specialization: string } | null;
      token_no: number;
      status: string;
      date_slot: string;
    }

    interface DoctorDisplay {
      doctor_name: string;
      specialization: string;
      current_token: number;
      current_patient: string;
      next_token: number;
      next_patient: string;
      waiting_count: number;
    }

    const grouped: Record<string, Apt[]> = {};

    (data || []).forEach((apt: Apt) => {
      const key = apt.doctor_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(apt);
    });

    const displays: DoctorDisplay[] = Object.values(grouped).map((appts) => {
      const current = appts.find(a => a.status === "in_progress");
      const next = appts.find(a => a.status === "scheduled");
      const waiting = appts.filter(a => a.status === "scheduled").length;

      return {
        doctor_name: appts[0]?.doctor?.full_name || "Unknown",
        specialization: appts[0]?.doctor?.specialization || "",
        current_token: current?.token_no || 0,
        current_patient: current?.patient?.name || "—",
        next_token: next?.token_no || 0,
        next_patient: next?.patient?.name || "—",
        waiting_count: waiting,
      };
    });

    return NextResponse.json({
      date: today,
      updated_at: new Date().toISOString(),
      doctors: displays,
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
