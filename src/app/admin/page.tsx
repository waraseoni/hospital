"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Users, UserRound, Activity, BedDouble, Calendar } from "lucide-react";

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
      setStats({
        doctors: doctors.count || 0,
        nurses: nurses.count || 0,
        patients: patients.count || 0,
        appointments: appointments.count || 0,
        beds: beds.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>;

  const cards = [
    { labelKey: "dash.doctors" as const, value: stats.doctors, icon: Users, color: "text-blue-600" },
    { labelKey: "dash.nurses" as const, value: stats.nurses, icon: UserRound, color: "text-green-600" },
    { labelKey: "dash.totalPatients" as const, value: stats.patients, icon: Activity, color: "text-purple-600" },
    { labelKey: "dash.todayAppts" as const, value: stats.appointments, icon: Calendar, color: "text-orange-600" },
    { labelKey: "dash.occupiedBeds" as const, value: stats.beds, icon: BedDouble, color: "text-red-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("dash.adminStats")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ labelKey, value, icon: Icon, color }) => (
          <div key={labelKey} className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
            <span className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 ${color}`}>
              <Icon size={20} />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{t(labelKey)}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}