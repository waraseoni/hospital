"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { StatCard } from "@/components/ui/card";
import { FlaskConical, CheckCircle, ClipboardList } from "lucide-react";
import { PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

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

  if (loading) return <PageContainer><Skeleton lines={3} /></PageContainer>;

  return (
    <PageContainer>
      <div className="mb-6"><h1 className="text-2xl font-bold">{t("roles.lab")}</h1></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={<FlaskConical size={20} />} label={t("dash.pendingTests")} value={stats.pending} className="text-orange-600" />
        <StatCard icon={<CheckCircle size={20} />} label={t("dash.finalizedTests")} value={stats.finalized} className="text-green-600" />
        <Link href="/lab/queue" className="flex items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
          <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList size={20} /></span>
          <div><p className="text-sm text-muted-foreground">{t("common.actions")}</p><p className="text-lg font-semibold mt-1 text-primary">{t("nav.testQueue")} →</p></div>
        </Link>
      </div>
    </PageContainer>
  );
}
