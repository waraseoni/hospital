import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctor_id");
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!doctorId || !date) {
      return NextResponse.json({ error: "doctor_id and date required" }, { status: 400 });
    }

    const targetDate = new Date(date);
    const weekday = targetDate.getDay();

    const { data: schedules } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", doctorId)
      .eq("weekday", weekday)
      .eq("is_active", true);

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ slots: [], message: "No schedule for this day" });
    }

    const dateStr = date;
    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("date_slot, status")
      .eq("doctor_id", doctorId)
      .gte("date_slot", `${dateStr}T00:00:00`)
      .lte("date_slot", `${dateStr}T23:59:59`)
      .in("status", ["scheduled", "in_progress"]);

    const bookedTimes = new Set(
      (existingAppointments || []).map((a) => new Date(a.date_slot).toISOString())
    );

    const slots: { time: string; display: string; available: boolean; token_no: number }[] = [];
    let tokenCounter = 1;

    for (const schedule of schedules) {
      const [startH, startM] = schedule.start_time.split(":").map(Number);
      const [endH, endM] = schedule.end_time.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m < endMinutes; m += schedule.slot_minutes) {
        const slotH = Math.floor(m / 60);
        const slotM = m % 60;
        const slotTime = `${dateStr}T${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}:00`;
        const slotISO = new Date(slotTime).toISOString();

        const hour12 = slotH > 12 ? slotH - 12 : slotH === 0 ? 12 : slotH;
        const ampm = slotH >= 12 ? "PM" : "AM";
        const display = `${hour12}:${String(slotM).padStart(2, "0")} ${ampm}`;

        slots.push({
          time: slotISO,
          display,
          available: !bookedTimes.has(slotISO),
          token_no: tokenCounter,
        });
        tokenCounter++;
      }
    }

    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
