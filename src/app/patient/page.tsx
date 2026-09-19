"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { StatCard } from "@/components/ui/card";
import { Calendar, Heart, FlaskConical } from "lucide-react";
import { PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

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
      setStats({ appointments: appts.count || 0, prescriptions: prescs.count || 0, reports: reports.count || 0 });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <PageContainer><Skeleton lines={3} /></PageContainer>;

  return (
    <PageContainer>
      <div className="mb-6"><h1 className="text-2xl font-bold">{t("dash.welcomePatient")}</h1></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<Calendar size={20} />} label={t("dash.todayAppts")} value={stats.appointments} className="text-blue-600" />
        <StatCard icon={<Heart size={20} />} label={t("nav.myPrescriptions")} value={stats.prescriptions} className="text-green-600" />
        <StatCard icon={<FlaskConical size={20} />} label={t("nav.labReports")} value={stats.reports} className="text-purple-600" />
      </div>
    </PageContainer>
  );
}
