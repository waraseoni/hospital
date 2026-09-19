"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Appointment } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import Link from "next/link";

const statusMap: Record<string, "info" | "success" | "warning" | "destructive"> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  cancelled: "destructive",
};

export default function DoctorOPDPage() {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { loadAppointments(); }, []);

  async function loadAppointments() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("appointments").select("*, patient:patients(name, uhid, phone)").eq("doctor_id", user.id).gte("date_slot", `${today}T00:00`).lte("date_slot", `${today}T23:59`).in("status", ["scheduled", "in_progress"]).order("token_no");
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: Appointment["status"]) {
    const supabase = createClient();
    await supabase.from("appointments").update({ status }).eq("id", id);
    addToast("success", status === "in_progress" ? "Consultation started" : status === "completed" ? "Completed" : "Cancelled");
    loadAppointments();
  }

  return (
    <div>
      <PageHeader title={t("opd.title")} />
      {loading ? <Skeleton lines={5} /> : appointments.length === 0 ? (
        <EmptyState title={t("opd.noAppointments")} description={t("ui.noData")} />
      ) : (
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">#{apt.token_no}</div>
                <div><p className="font-medium">{apt.patient?.name}</p><p className="text-xs text-muted-foreground">UHID: {apt.patient?.uhid}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusMap[apt.status] || "default"}>{apt.status.replace("_", " ")}</Badge>
                {apt.status === "scheduled" && <Button size="sm" onClick={() => updateStatus(apt.id, "in_progress")}>{t("opd.startConsultation")}</Button>}
                {apt.status === "in_progress" && (
                  <>
                    <Link href={`/doctor/prescriptions/new?patient=${apt.patient_id}&appointment=${apt.id}`}><Button size="sm" variant="secondary">{t("opd.writePrescription")}</Button></Link>
                    <Button size="sm" variant="secondary" className="bg-green-600 text-white hover:bg-green-700" onClick={() => updateStatus(apt.id, "completed")}>{t("opd.complete")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(apt.id, "cancelled")}>{t("opd.cancel")}</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
