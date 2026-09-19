"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LabReport } from "@/types/database";
import { formatDate } from "@/lib/utils/formatters";
import { useI18n } from "@/i18n/provider";

export default function PatientReportsPage() {
  const { t } = useI18n();
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
      if (!patient) { setLoading(false); return; }

      const { data } = await supabase.from("lab_reports").select("*")
        .eq("patient_id", patient.id).eq("status", "finalized").order("created_at", { ascending: false });
      setReports((data as LabReport[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("reports.title")}</h1>
      {loading ? (
        <div className="animate-pulse text-muted-foreground">{t("reports.loading")}</div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">{t("reports.noReports")}</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <p className="font-medium">{r.test_name}</p>
                <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
              </div>
              {r.pdf_url && (
                <a href={r.pdf_url} target="_blank" rel="noopener" className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20">
                  {t("reports.downloadReport")}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
