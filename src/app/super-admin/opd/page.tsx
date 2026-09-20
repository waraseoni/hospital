"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { StatCard } from "@/components/ui/card";
import { Users, Activity, Clock, TrendingUp, Stethoscope } from "lucide-react";

interface DoctorStats {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  total: number;
  waiting: number;
  in_progress: number;
  completed: number;
}

export default function SuperAdminOPDPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<DoctorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("today");

  const supabase = createClient();

  useEffect(() => { loadData(); }, [dateRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let dateFilter = new Date().toISOString().split("T")[0];
      let startDate = `${dateFilter}T00:00`;
      let endDate = `${dateFilter}T23:59`;

      if (dateRange === "week") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split("T")[0] + "T00:00";
      } else if (dateRange === "month") {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        startDate = d.toISOString().split("T")[0] + "T00:00";
      }

      const { data: apts } = await supabase
        .from("appointments")
        .select("*, doctor:profiles(id, full_name, specialization)")
        .gte("date_slot", startDate)
        .lte("date_slot", endDate)
        .order("token_no");

      const grouped: Record<string, DoctorStats> = {};
      (apts as any[] || []).forEach((apt) => {
        const docId = apt.doctor?.id || "unknown";
        if (!grouped[docId]) {
          grouped[docId] = {
            doctor_id: docId,
            doctor_name: apt.doctor?.full_name || "Unknown",
            specialization: apt.doctor?.specialization || "",
            total: 0,
            waiting: 0,
            in_progress: 0,
            completed: 0,
          };
        }
        grouped[docId].total++;
        if (apt.status === "scheduled") grouped[docId].waiting++;
        if (apt.status === "in_progress") grouped[docId].in_progress++;
        if (apt.status === "completed") grouped[docId].completed++;
      });

      setStats(Object.values(grouped).sort((a, b) => b.total - a.total));
    } catch { /* ignore */ }
    setLoading(false);
  }, [dateRange]);

  const totalPatients = stats.reduce((sum, s) => sum + s.total, 0);
  const totalWaiting = stats.reduce((sum, s) => sum + s.waiting, 0);
  const totalInProgress = stats.reduce((sum, s) => sum + s.in_progress, 0);
  const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0);
  const avgPerDoctor = stats.length > 0 ? Math.round(totalPatients / stats.length) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="OPD Analytics Dashboard"
        subtitle="Hospital-wide OPD overview"
        actions={
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        }
      />

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-5 mb-6">
        <StatCard icon={<Users size={20} />} label="Total Patients" value={totalPatients} />
        <StatCard icon={<Clock size={20} />} label="Waiting" value={totalWaiting} />
        <StatCard icon={<Activity size={20} />} label="In Consultation" value={totalInProgress} />
        <StatCard icon={<TrendingUp size={20} />} label="Completed" value={totalCompleted} />
        <StatCard icon={<Stethoscope size={20} />} label="Avg per Doctor" value={avgPerDoctor} />
      </div>

      {loading ? (
        <Skeleton lines={8} />
      ) : stats.length === 0 ? (
        <EmptyState title="No OPD data" description="No appointments found for the selected period" />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Doctor</th>
                <th className="px-4 py-3 font-medium">Specialization</th>
                <th className="px-4 py-3 font-medium text-center">Total</th>
                <th className="px-4 py-3 font-medium text-center">Waiting</th>
                <th className="px-4 py-3 font-medium text-center">Active</th>
                <th className="px-4 py-3 font-medium text-center">Completed</th>
                <th className="px-4 py-3 font-medium text-center">Completion %</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.doctor_id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">Dr. {s.doctor_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.specialization || "—"}</td>
                  <td className="px-4 py-3 text-center font-bold">{s.total}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="warning">{s.waiting}</Badge></td>
                  <td className="px-4 py-3 text-center"><Badge variant="info">{s.in_progress}</Badge></td>
                  <td className="px-4 py-3 text-center"><Badge variant="success">{s.completed}</Badge></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${s.total > 0 ? (s.completed / s.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
