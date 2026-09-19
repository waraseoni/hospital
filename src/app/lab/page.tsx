"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import { FlaskConical, CheckCircle, ClipboardList } from "lucide-react";

export default function LabDashboardPage() {
  const { t } = useI18n();
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

  if (loading) return <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("roles.lab")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
            <FlaskConical size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash.pendingTests")}</p>
            <p className="text-3xl font-bold mt-1 text-orange-600">{stats.pending}</p>
          </div>
        </div>
        <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
            <CheckCircle size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("dash.finalizedTests")}</p>
            <p className="text-3xl font-bold mt-1 text-green-600">{stats.finalized}</p>
          </div>
        </div>
        <Link href="/lab/queue" className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList size={20} />
          </span>
          <div>
            <p className="text-sm text-muted-foreground">{t("common.actions")}</p>
            <p className="text-lg font-semibold mt-1 text-primary">{t("nav.testQueue")} →</p>
          </div>
        </Link>
      </div>
    </div>
  );
}