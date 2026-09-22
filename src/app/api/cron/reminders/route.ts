import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentReminder } from "@/lib/whatsapp/client";
import { sendTelegramMessage } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // Scheduled appointments tomorrow that haven't been reminded yet
  const { data: appts, error } = await admin
    .from("appointments")
    .select("id, date_slot, token_no, patient:patients(name, phone), doctor:profiles(full_name)")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("date_slot", tomorrowStart.toISOString())
    .lte("date_slot", tomorrowEnd.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (appts as unknown) as Array<{
    id: string;
    date_slot: string;
    token_no: number;
    patient?: { name: string; phone: string } | null;
    doctor?: { full_name: string } | null;
  }>;

  let sent = 0;
  let failed = 0;

  for (const appt of rows) {
    if (!appt.patient?.phone) continue;
    const patientName = appt.patient.name || "Patient";
    const doctorName = appt.doctor?.full_name || "";
    const dateStr = new Date(appt.date_slot).toLocaleString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });

    const result = await sendAppointmentReminder(appt.patient.phone, patientName, doctorName, dateStr);
    if (result.success) {
      await admin.from("appointments").update({ reminder_sent_at: new Date().toISOString() }).eq("id", appt.id);
      sent++;
    } else {
      failed++;
    }
  }

  if (rows.length > 0) {
    await sendTelegramMessage(
      `📅 Appointment Reminder Run\nSent: <b>${sent}</b>\nFailed: <b>${failed}</b>\nAppointments: <b>${rows.length}</b>`
    );
  }

  return NextResponse.json({ success: true, checked: rows.length, sent, failed });
}