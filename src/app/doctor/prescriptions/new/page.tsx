"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Patient, MedicineItem } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/page";

function PrescriptionForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient");
  const appointmentId = searchParams.get("appointment");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<MedicineItem[]>([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (patientId) { const { data } = await supabase.from("patients").select("*").eq("id", patientId).single(); setPatient(data); }
      setLoading(false);
    }
    load();
  }, [patientId]);

  function addMedicine() { setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]); }
  function updateMedicine(index: number, field: keyof MedicineItem, value: string) {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  }
  function removeMedicine(index: number) {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !patientId) { setSaving(false); return; }
    const { error } = await supabase.from("prescriptions").insert({ patient_id: patientId, doctor_id: user.id, appointment_id: appointmentId || null, diagnosis, symptoms, notes, medicines: medicines.filter(m => m.name.trim()) });
    if (!error) { addToast("success", t("doctorPrescriptions.savedSuccess") || "Prescription saved"); router.push("/doctor/opd"); }
    else addToast("error", "Failed to save");
    setSaving(false);
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title={t("doctorPrescriptions.title")} />
      {patient && <p className="mb-6 text-sm text-muted-foreground">{t("doctorPrescriptions.patient")}: {patient.name} (UHID: {patient.uhid})</p>}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("doctorPrescriptions.clinicalDetails")}</h2>
          <Input label={t("doctorPrescriptions.diagnosis")} placeholder={t("doctorPrescriptions.diagnosisPlaceholder")} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} required />
          <Input label={t("doctorPrescriptions.symptoms")} placeholder={t("doctorPrescriptions.symptomsPlaceholder")} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{t("doctorPrescriptions.medicines")}</h2>
            <button type="button" onClick={addMedicine} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20">+ {t("doctorPrescriptions.addMedicine")}</button>
          </div>
          {medicines.map((med, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-5 items-end">
              <Input placeholder={t("doctorPrescriptions.medicineName")} value={med.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} />
              <Input placeholder={t("doctorPrescriptions.dosage")} value={med.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} />
              <Input placeholder={t("doctorPrescriptions.frequency")} value={med.frequency} onChange={(e) => updateMedicine(i, "frequency", e.target.value)} />
              <Input placeholder={t("doctorPrescriptions.duration")} value={med.duration} onChange={(e) => updateMedicine(i, "duration", e.target.value)} />
              <div className="flex gap-1">
                <Input placeholder={t("doctorPrescriptions.instructions")} value={med.instructions} onChange={(e) => updateMedicine(i, "instructions", e.target.value)} />
                {medicines.length > 1 && <button type="button" onClick={() => removeMedicine(i)} className="rounded-lg border border-border px-2 text-destructive hover:bg-destructive/10 text-sm">&times;</button>}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Input label={t("doctorPrescriptions.doctorNotes")} placeholder={t("doctorPrescriptions.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? t("doctorPrescriptions.saving") : t("doctorPrescriptions.saveAndSend")}</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>{t("common.cancel")}</Button>
        </div>
      </form>
    </div>
  );
}

export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-muted-foreground">Loading...</div>}>
      <PrescriptionForm />
    </Suspense>
  );
}
