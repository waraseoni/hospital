"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Prescription } from "@/types/database";
import { formatDate } from "@/lib/utils/formatters";
import { useI18n } from "@/i18n/provider";

export default function PatientPrescriptionsPage() {
  const { t } = useI18n();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
      if (!patient) { setLoading(false); return; }

      const { data } = await supabase.from("prescriptions").select("*, doctor:profiles(full_name)")
        .eq("patient_id", patient.id).order("created_at", { ascending: false });
      setPrescriptions((data as Prescription[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("patientPrescriptions.title")}</h1>
      {loading ? (
        <div className="animate-pulse text-muted-foreground">{t("patientPrescriptions.loading")}</div>
      ) : prescriptions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">{t("patientPrescriptions.noPrescriptions")}</div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map(p => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{p.diagnosis}</p>
                  <p className="text-xs text-muted-foreground">{t("patientPrescriptions.prescribedBy")} {p.doctor?.full_name} | {formatDate(p.created_at)}</p>
                </div>
                {p.pdf_url && (
                  <a href={p.pdf_url} target="_blank" rel="noopener" className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20">
                    {t("patientPrescriptions.downloadPdf")}
                  </a>
                )}
              </div>
              <div className="space-y-1">
                {p.medicines.map((med, i) => (
                  <div key={i} className="flex gap-4 text-sm">
                    <span className="font-medium">{med.name}</span>
                    <span className="text-muted-foreground">{med.dosage} | {med.frequency} | {med.duration}</span>
                    {med.instructions && <span className="text-xs text-muted-foreground italic">({med.instructions})</span>}
                  </div>
                ))}
              </div>
              {p.notes && <p className="mt-3 text-sm text-muted-foreground italic">{t("patientPrescriptions.note")}: {p.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
