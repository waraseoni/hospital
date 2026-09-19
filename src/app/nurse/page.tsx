"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { BedDouble, Users } from "lucide-react";

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

  if (loading) return <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("dash.welcomeNurse")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
            <BedDouble size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash.occupiedBeds")}</p>
            <p className="text-3xl font-bold mt-1 text-orange-600">{stats.occupiedBeds}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Users size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash.totalPatients")}</p>
            <p className="text-3xl font-bold mt-1 text-blue-600">{stats.totalPatients}</p>
          </div>
        </div>
      </div>
    </div>
  );
}