"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Patient, MedicineItem } from "@/types/database";

function PrescriptionForm() {
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

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (patientId) {
        const { data } = await supabase.from("patients").select("*").eq("id", patientId).single();
        setPatient(data);
      }
      setLoading(false);
    }
    load();
  }, [patientId]);

  function addMedicine() {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  }

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

    const { error } = await supabase.from("prescriptions").insert({
      patient_id: patientId,
      doctor_id: user.id,
      appointment_id: appointmentId || null,
      diagnosis,
      symptoms,
      notes,
      medicines: medicines.filter(m => m.name.trim()),
    });

    if (!error) {
      router.push("/doctor/opd");
    }
    setSaving(false);
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">New Prescription</h1>
      {patient && (
        <p className="text-sm text-muted-foreground mb-6">
          Patient: {patient.name} (UHID: {patient.uhid})
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Clinical Details</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Diagnosis *</label>
            <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" required placeholder="Primary diagnosis..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Symptoms</label>
            <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Patient symptoms..." />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Medicines</h2>
            <button type="button" onClick={addMedicine} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20">
              + Add Medicine
            </button>
          </div>
          {medicines.map((med, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-5 items-end">
              <input placeholder="Medicine name" value={med.name} onChange={(e) => updateMedicine(i, "name", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input placeholder="Dosage (500mg)" value={med.dosage} onChange={(e) => updateMedicine(i, "dosage", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input placeholder="Frequency (TDS)" value={med.frequency} onChange={(e) => updateMedicine(i, "frequency", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input placeholder="Duration (5 days)" value={med.duration} onChange={(e) => updateMedicine(i, "duration", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <div className="flex gap-1">
                <input placeholder="Instructions" value={med.instructions} onChange={(e) => updateMedicine(i, "instructions", e.target.value)} className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                {medicines.length > 1 && (
                  <button type="button" onClick={() => removeMedicine(i)} className="rounded-lg border border-border px-2 text-destructive hover:bg-destructive/10 text-sm">&times;</button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <label className="block text-sm font-medium mb-1">Doctor Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Additional notes for patient..." />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Saving..." : "Save & Send to Pharmacy"}
          </button>
          <button type="button" onClick={() => router.back()} className="rounded-lg border border-border px-6 py-2 text-sm hover:bg-muted">
            Cancel
          </button>
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
