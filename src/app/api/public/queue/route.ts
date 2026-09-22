import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("appointments")
      .select(`
        id, token_no, status, consultation_type, date_slot,
        doctor:profiles(id, full_name, specialization)
      `)
      .gte("date_slot", `${today}T00:00`)
      .lte("date_slot", `${today}T23:59`)
      .neq("status", "cancelled")
      .order("doctor_id")
      .order("token_no", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    interface Apt {
      id: string;
      token_no: number;
      status: string;
      consultation_type?: string;
      date_slot?: string;
      doctor: { id: string; full_name: string; specialization: string }[] | { id: string; full_name: string; specialization: string } | null;
    }

    const rows = (data || []) as unknown as Apt[];
    const grouped: Record<string, {
      doctor: { full_name: string; specialization: string } | null;
      current: number | null;
      waiting: number;
      next: number[];
    }> = {};

    rows.forEach((apt) => {
      const doctorRaw = Array.isArray(apt.doctor) ? apt.doctor[0] ?? null : apt.doctor;
      const doctor = doctorRaw
        ? { id: doctorRaw.id, full_name: doctorRaw.full_name, specialization: doctorRaw.specialization }
        : null;
      const key = doctor?.id || "unknown";
      if (!grouped[key]) {
        grouped[key] = { doctor, current: null, waiting: 0, next: [] };
      }
      if (apt.status === "in_progress") grouped[key].current = apt.token_no;
      if (apt.status === "scheduled") {
        grouped[key].waiting++;
        if (grouped[key].next.length < 5) grouped[key].next.push(apt.token_no);
      }
    });

    return NextResponse.json({
      date: today,
      generated_at: new Date().toISOString(),
      doctors: Object.values(grouped).filter(d => d.current !== null || d.waiting > 0),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
