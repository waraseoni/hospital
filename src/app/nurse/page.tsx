"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { StatCard } from "@/components/ui/card";
import { Activity, UserRound, BedDouble } from "lucide-react";
import { PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

export default function NurseDashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ occupiedBeds: 0, pendingVitals: 0, totalPatients: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [beds, patients] = await Promise.all([
        supabase.from("beds").select("id", { count: "exact", head: true }).eq("is_occupied", true),
        supabase.from("patients").select("id", { count: "exact", head: true }),
      ]);
      setStats({ occupiedBeds: beds.count || 0, pendingVitals: 0, totalPatients: patients.count || 0 });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <PageContainer><Skeleton lines={3} /></PageContainer>;

  return (
    <PageContainer>
      <div className="mb-6"><h1 className="text-2xl font-bold">{t("dash.welcomeNurse")}</h1></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<BedDouble size={20} />} label={t("dash.occupiedBeds")} value={stats.occupiedBeds} className="text-orange-600" />
        <StatCard icon={<Activity size={20} />} label={t("vitals.recentVitals")} value={stats.pendingVitals} className="text-blue-600" />
        <StatCard icon={<UserRound size={20} />} label={t("dash.totalPatients")} value={stats.totalPatients} className="text-green-600" />
      </div>
    </PageContainer>
  );
}
