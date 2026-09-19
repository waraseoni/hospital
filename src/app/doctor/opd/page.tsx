"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Appointment } from "@/types/database";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";

export default function DoctorOPDPage() {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAppointments() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("appointments")
      .select("*, patient:patients(name, uhid, phone)")
      .eq("doctor_id", user.id)
      .gte("date_slot", `${today}T00:00`)
      .lte("date_slot", `${today}T23:59`)
      .in("status", ["scheduled", "in_progress"])
      .order("token_no");

    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadAppointments(); }, []);

  async function updateStatus(id: string, status: Appointment["status"]) {
    const supabase = createClient();
    await supabase.from("appointments").update({ status }).eq("id", id);
    loadAppointments();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("opd.title")}</h1>
      {loading ? (
        <div className="animate-pulse text-muted-foreground">{t("opd.loading")}</div>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">{t("opd.noAppointments")}</div>
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  #{apt.token_no}
                </div>
                <div>
                  <p className="font-medium">{apt.patient?.name}</p>
                  <p className="text-xs text-muted-foreground">UHID: {apt.patient?.uhid}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {apt.status === "scheduled" && (
                  <button onClick={() => updateStatus(apt.id, "in_progress")} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700">
                    {t("opd.startConsultation")}
                  </button>
                )}
                {apt.status === "in_progress" && (
                  <div className="flex gap-2">
                    <Link href={`/doctor/prescriptions/new?patient=${apt.patient_id}&appointment=${apt.id}`} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90">
                      {t("opd.writePrescription")}
                    </Link>
                    <button onClick={() => updateStatus(apt.id, "completed")} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700">
                      {t("opd.complete")}
                    </button>
                    <button onClick={() => updateStatus(apt.id, "cancelled")} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
                      {t("opd.cancel")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
