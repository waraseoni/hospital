"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { VitalsRecord } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { HeartPulse } from "lucide-react";

export default function PatientVitalsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<VitalsRecord[]>([]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
      if (patient) {
        const { data } = await supabase.from("vitals_records").select("*")
          .eq("patient_id", patient.id).order("recorded_at", { ascending: false });
        setRecords((data as VitalsRecord[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("patientVitals.title")} subtitle={t("patientVitals.subtitle")} />

      {records.length === 0 ? (
        <EmptyState
          title={t("patientVitals.noVitals")}
          description={t("ui.noData")}
          icon={<HeartPulse size={32} className="text-muted-foreground" />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                {new Date(r.recorded_at).toLocaleString("en-IN")}
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("patientVitals.bp")}</p>
                  <p className="font-semibold">{r.bp_systolic}/{r.bp_diastolic}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("patientVitals.pulse")}</p>
                  <p className="font-semibold">{r.pulse} bpm</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("patientVitals.spo2")}</p>
                  <p className="font-semibold">{r.spo2}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("patientVitals.temp")}</p>
                  <p className="font-semibold">{r.temperature}°C</p>
                </div>
                {r.weight != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t("patientVitals.weight")}</p>
                    <p className="font-semibold">{r.weight} kg</p>
                  </div>
                )}
                {r.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm">{r.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}