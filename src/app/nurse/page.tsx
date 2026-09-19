"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NurseDashboardPage() {
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

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Nursing Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Occupied Beds</p>
          <p className="text-3xl font-bold mt-1 text-orange-600">{stats.occupiedBeds}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Patients</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{stats.totalPatients}</p>
        </div>
      </div>
    </div>
  );
}
