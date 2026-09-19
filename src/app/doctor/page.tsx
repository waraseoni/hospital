"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function DoctorDashboardPage() {
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

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Doctor Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Today&apos;s Appointments</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{todayAppointments}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Pending Lab Orders</p>
          <p className="text-3xl font-bold mt-1 text-orange-600">{pendingLabOrders}</p>
        </div>
        <Link href="/doctor/opd" className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
          <p className="text-sm text-muted-foreground">Quick Action</p>
          <p className="text-lg font-semibold mt-1 text-primary">Open OPD Queue &rarr;</p>
        </Link>
      </div>
    </div>
  );
}
