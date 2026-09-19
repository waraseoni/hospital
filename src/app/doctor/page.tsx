"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { Calendar, FlaskConical, ClipboardList } from "lucide-react";

export default function DoctorDashboardPage() {
  const { t } = useI18n();
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [pendingLabOrders, setPendingLabOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const today = new Date().toISOString().split("T")[0];
      const [appts, pending] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true })
          .eq("doctor_id", user.id).gte("date_slot", `${today}T00:00`).lte("date_slot", `${today}T23:59`)
          .in("status", ["scheduled", "in_progress"]),
        supabase.from("lab_reports").select("id", { count: "exact", head: true })
          .eq("doctor_id", user.id).eq("status", "pending"),
      ]);
      setTodayAppointments(appts.count || 0);
      setPendingLabOrders(pending.count || 0);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("dash.welcomeDoctor")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
            <Calendar size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash.todayAppointments")}</p>
            <p className="text-3xl font-bold mt-1 text-blue-600">{todayAppointments}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
            <FlaskConical size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash.pendingLabOrders")}</p>
            <p className="text-3xl font-bold mt-1 text-orange-600">{pendingLabOrders}</p>
          </div>
        </div>
        <Link href="/doctor/opd" className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("common.actions")}</p>
            <p className="text-lg font-semibold mt-1 text-primary">{t("nav.opdQueue")} →</p>
          </div>
        </Link>
      </div>
    </div>
  );
}