"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { StatCard } from "@/components/ui/card";
import { Activity, UserRound, Calendar, BedDouble, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ doctors: 0, nurses: 0, patients: 0, appointments: 0, beds: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [doctors, nurses, patients, appointments, beds] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "doctor"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "nurse"),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("beds").select("id", { count: "exact", head: true }).eq("is_occupied", true),
      ]);
      setStats({ doctors: doctors.count || 0, nurses: nurses.count || 0, patients: patients.count || 0, appointments: appointments.count || 0, beds: beds.count || 0 });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;

  const cards = [
    { labelKey: "dash.doctors" as const, value: stats.doctors, icon: UserRound, color: "text-blue-600" },
    { labelKey: "dash.nurses" as const, value: stats.nurses, icon: Activity, color: "text-green-600" },
    { labelKey: "dash.totalPatients" as const, value: stats.patients, icon: Calendar, color: "text-purple-600" },
    { labelKey: "dash.todayAppts" as const, value: stats.appointments, icon: ClipboardList, color: "text-orange-600" },
    { labelKey: "dash.occupiedBeds" as const, value: stats.beds, icon: BedDouble, color: "text-red-600" },
  ];

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("dash.adminStats")}</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ labelKey, value, icon: Icon, color }) => (
          <StatCard key={labelKey} icon={<Icon size={20} />} label={t(labelKey)} value={value} className={color} />
        ))}
      </div>
    </PageContainer>
  );
}
