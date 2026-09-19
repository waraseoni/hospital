"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Calendar, Heart, FlaskConical } from "lucide-react";

export default function PatientDashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ appointments: 0, prescriptions: 0, reports: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
      if (!patient) { setLoading(false); return; }

      const [appts, prescs, reports] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).in("status", ["scheduled", "in_progress"]),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("patient_id", patient.id),
        supabase.from("lab_reports").select("id", { count: "exact", head: true }).eq("patient_id", patient.id).eq("status", "finalized"),
      ]);

      setStats({
        appointments: appts.count || 0,
        prescriptions: prescs.count || 0,
        reports: reports.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("dash.welcomePatient")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Calendar size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash.todayAppts")}</p>
            <p className="text-3xl font-bold mt-1 text-blue-600">{stats.appointments}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
            <Heart size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("nav.myPrescriptions")}</p>
            <p className="text-3xl font-bold mt-1 text-green-600">{stats.prescriptions}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
            <FlaskConical size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("nav.labReports")}</p>
            <p className="text-3xl font-bold mt-1 text-purple-600">{stats.reports}</p>
          </div>
        </div>
      </div>
    </div>
  );
}