"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { StatCard } from "@/components/ui/card";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserRound, BedDouble, Package, Activity, ArrowRight } from "lucide-react";
import { formatDateTime } from "@/lib/utils/formatters";

export default function SuperAdminDashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ totalUsers: 0, doctors: 0, nurses: 0, patients: 0, beds: 0, inventory: 0 });
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);

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
      const { data: logsData } = await supabase.from("audit_logs").select("*, user:profiles(full_name)").order("created_at", { ascending: false }).limit(10);
      setStats({
        totalUsers: users.count || 0,
        doctors: doctors || 0,
        nurses: nurses || 0,
        patients: patients.count || 0,
        beds: beds.count || 0,
        inventory: inventory.count || 0,
      });
      setLogs((logsData || []).map(l => ({ ...l, user_name: (l.user as Record<string, unknown>)?.full_name })));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <PageContainer>
      <PageHeader title={t("superAdmin.dashboard")} subtitle={t("superAdmin.dashboardSubtitle")} />
      {loading ? <Skeleton lines={3} /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={<Users size={20} />} label={t("superAdmin.totalUsers")} value={stats.totalUsers} />
            <StatCard icon={<Activity size={20} />} label={t("superAdmin.doctors")} value={stats.doctors} />
            <StatCard icon={<Users size={20} />} label={t("superAdmin.nurses")} value={stats.nurses} />
            <StatCard icon={<UserRound size={20} />} label={t("superAdmin.totalPatients")} value={stats.patients} />
            <StatCard icon={<BedDouble size={20} />} label={t("superAdmin.totalBeds")} value={stats.beds} />
            <StatCard icon={<Package size={20} />} label={t("superAdmin.totalInventory")} value={stats.inventory} />
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{t("superAdmin.recentActivity")}</h2>
              <a href="/super-admin/audit" className="text-sm text-primary hover:underline flex items-center gap-1">{t("superAdmin.viewAll")} <ArrowRight size={14} /></a>
            </div>
            {logs.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">{t("superAdmin.noActivity")}</div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Time</th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Action</th>
                    <th className="px-4 py-3 text-left font-medium">Table</th>
                  </tr></thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(log.created_at as string)}</td>
                        <td className="px-4 py-3">{log.user_name as string || t("audit.system")}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${log.action === "DELETE" ? "bg-red-100 text-red-800" : log.action === "INSERT" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                            {log.action as string}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{log.table_name as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
