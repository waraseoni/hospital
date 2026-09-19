"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { StatCard } from "@/components/ui/card";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserRound, BedDouble, Package, Activity } from "lucide-react";

export default function SuperAdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ totalUsers: 0, doctors: 0, nurses: 0, patients: 0, beds: 0, inventory: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [users, patients, beds, inventory] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("beds").select("id", { count: "exact", head: true }),
        supabase.from("inventory_items").select("id", { count: "exact", head: true }),
      ]);
      const { count: doctors } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "doctor");
      const { count: nurses } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "nurse");
      setStats({
        totalUsers: users.count || 0,
        doctors: doctors || 0,
        nurses: nurses || 0,
        patients: patients.count || 0,
        beds: beds.count || 0,
        inventory: inventory.count || 0,
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <PageContainer>
      <PageHeader title={t("superAdmin.dashboard")} subtitle={t("superAdmin.dashboardSubtitle")} />
      {loading ? <Skeleton lines={3} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard icon={<Users size={20} />} label={t("superAdmin.totalUsers")} value={stats.totalUsers} />
          <StatCard icon={<Activity size={20} />} label={t("superAdmin.doctors")} value={stats.doctors} />
          <StatCard icon={<Users size={20} />} label={t("superAdmin.nurses")} value={stats.nurses} />
          <StatCard icon={<UserRound size={20} />} label={t("superAdmin.totalPatients")} value={stats.patients} />
          <StatCard icon={<BedDouble size={20} />} label={t("superAdmin.totalBeds")} value={stats.beds} />
          <StatCard icon={<Package size={20} />} label={t("superAdmin.totalInventory")} value={stats.inventory} />
        </div>
      )}
    </PageContainer>
  );
}
