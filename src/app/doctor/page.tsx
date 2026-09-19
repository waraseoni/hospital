"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, FlaskConical, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

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
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("doctor_id", user.id).gte("date_slot", `${today}T00:00`).lte("date_slot", `${today}T23:59`).in("status", ["scheduled", "in_progress"]),
        supabase.from("lab_reports").select("id", { count: "exact", head: true }).eq("doctor_id", user.id).eq("status", "pending"),
      ]);
      setTodayAppointments(appts.count || 0);
      setPendingLabOrders(pending.count || 0);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <PageContainer><Skeleton lines={3} /></PageContainer>;

  const cards = [
    { labelKey: "dash.todayAppointments" as const, value: todayAppointments, icon: Calendar, color: "text-blue-600" },
    { labelKey: "dash.pendingLabOrders" as const, value: pendingLabOrders, icon: FlaskConical, color: "text-orange-600" },
    { labelKey: "common.actions" as const, value: null, icon: ClipboardList, color: "text-primary", link: "/doctor/opd" },
  ];

  return (
    <PageContainer>
      <div className="mb-6"><h1 className="text-2xl font-bold">{t("dash.welcomeDoctor")}</h1></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ labelKey, value, icon: Icon, color, link }) => (
          <StatCard key={labelKey} icon={<Icon size={20} />} label={t(labelKey)} value={value ?? "—"} className={color} />
        ))}
      </div>
    </PageContainer>
  );
}
