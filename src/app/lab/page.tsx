"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LabDashboardPage() {
  const [stats, setStats] = useState({ pending: 0, finalized: 0, todayTests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [pending, finalized] = await Promise.all([
        supabase.from("lab_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("lab_reports").select("id", { count: "exact", head: true }).eq("status", "finalized"),
      ]);
      setStats({ pending: pending.count || 0, finalized: finalized.count || 0, todayTests: 0 });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Lab Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Pending Tests</p>
          <p className="text-3xl font-bold mt-1 text-orange-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Finalized Reports</p>
          <p className="text-3xl font-bold mt-1 text-green-600">{stats.finalized}</p>
        </div>
        <Link href="/lab/queue" className="rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
          <p className="text-sm text-muted-foreground">Quick Action</p>
          <p className="text-lg font-semibold mt-1 text-primary">Open Test Queue &rarr;</p>
        </Link>
      </div>
    </div>
  );
}
