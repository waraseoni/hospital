"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Patient, MedicineItem } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { UserRound, Search, Calendar, FileText } from "lucide-react";

function PrescriptionForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patient");
  const appointmentId = searchParams.get("appointment");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [notes, setNotes] = useState("");
  const [medicines, setMedicines] = useState<MedicineItem[]>([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  const [labTests, setLabTests] = useState<{ name: string; category: string }[]>([]);
  const [newTestName, setNewTestName] = useState("");
  const [newTestCategory, setNewTestCategory] = useState("general");
  const [imagingOrders, setImagingOrders] = useState<{ modality: string; body_part: string; indication: string }[]>([]);
  const [newImaging, setNewImaging] = useState({ modality: "xray", body_part: "", indication: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (patientIdParam) {
        const { data } = await supabase.from("patients").select("*").eq("id", patientIdParam).single();
        if (data) setPatient(data);
      }
      setLoading(false);
    }
    load();
  }, [patientIdParam]);

  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("patients")
      .select("*")
      .or(`name.ilike.%${query}%,uhid.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(10);
    setSearchResults((data as Patient[]) || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (searchQuery) searchPatients(searchQuery); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  function selectPatient(p: Patient) {
    setPatient(p);
    setSearchQuery("");
    setSearchResults([]);
  }

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

  function addLabTest() {
    if (!newTestName.trim()) return;
    setLabTests([...labTests, { name: newTestName.trim(), category: newTestCategory }]);
    setNewTestName("");
  }

  function removeLabTest(index: number) {
    setLabTests(labTests.filter((_, i) => i !== index));
  }

  function addImagingOrder() {
    if (!newImaging.body_part.trim()) return;
    setImagingOrders([...imagingOrders, { ...newImaging }]);
    setNewImaging({ modality: "xray", body_part: "", indication: "" });
  }

  function removeImagingOrder(index: number) {
    setImagingOrders(imagingOrders.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) { addToast("error", t("doctorPrescriptions.selectPatientFirst") || "Please select a patient first"); return; }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("prescriptions").insert({
      patient_id: patient.id,
      doctor_id: user.id,
      appointment_id: appointmentId || null,
      diagnosis,
      symptoms,
      notes,
      medicines: medicines.filter(m => m.name.trim()),
    });
    if (!error) {
      if (labTests.length > 0 && patient) {
        const labInserts = labTests.map((test) => ({
          patient_id: patient.id,
          doctor_id: user.id,
          ordered_by: user.id,
          test_name: test.name,
          test_category: test.category,
          status: "pending" as const,
        }));
        await supabase.from("lab_reports").insert(labInserts);
      }
      if (imagingOrders.length > 0 && patient) {
        const imagingInserts = imagingOrders.map((img) => ({
          patient_id: patient.id,
          ordered_by: user.id,
          modality: img.modality,
          body_part: img.body_part,
          clinical_indication: img.indication,
          status: "ordered" as const,
        }));
        await supabase.from("imaging_requests").insert(imagingInserts);
      }
      addToast("success", t("doctorPrescriptions.savedSuccess") || "Prescription saved");
      router.push("/doctor/opd");
    } else {
      addToast("error", "Failed to save");
    }
    setSaving(false);
  }

  if (loading) return <PageContainer><div className="animate-pulse text-muted-foreground">{t("common.loading")}</div></PageContainer>;

  return (
    <PageContainer>
      <div className="max-w-2xl">
        <PageHeader title={t("doctorPrescriptions.title")} />

        {/* Patient Selection */}
        {!patient ? (
          <div className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserRound size={16} className="text-primary" />
              {t("doctorPrescriptions.selectPatient") || "Select Patient for Prescription"}
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("doctorPrescriptions.searchPatient") || "Search by name, UHID, or phone..."}
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm"
                autoFocus
              />
              {searching && <p className="mt-1 text-xs text-muted-foreground">{t("common.loading")}</p>}
            </div>
            {searchResults.length > 0 && (
              <div className="rounded-lg border border-border bg-background max-h-60 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPatient(p)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-muted border-b border-border last:border-0"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">UHID: {p.uhid} | {p.phone}</p>
                    </div>
                    <Badge variant="info">{p.gender}</Badge>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
              <p className="text-sm text-muted-foreground">{t("doctorPrescriptions.noPatients") || "No patients found"}</p>
            )}
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound size={20} />
                </div>
                <div>
                  <p className="font-semibold">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">UHID: {patient.uhid} | {patient.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {appointmentId && (
                  <Badge variant="info"><Calendar size={12} className="mr-1" />Linked to Appointment</Badge>
                )}
                <button
                  type="button"
                  onClick={() => { setPatient(null); setSearchQuery(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  {t("doctorPrescriptions.changePatient") || "Change Patient"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Prescription Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-muted-foreground" />
              <h2 className="font-semibold">{t("doctorPrescriptions.clinicalDetails")}</h2>
            </div>
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

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Order Lab Tests</h2>
            <div className="flex gap-2">
              <Input placeholder="Test name (e.g. CBC, Blood Sugar)" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabTest())} />
              <select value={newTestCategory} onChange={(e) => setNewTestCategory(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
                <option value="general">General</option>
                <option value="blood">Blood</option>
                <option value="urine">Urine</option>
                <option value="imaging">Imaging</option>
                <option value="other">Other</option>
              </select>
              <Button type="button" variant="outline" onClick={addLabTest}>Add</Button>
            </div>
            {labTests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {labTests.map((test, i) => (
                  <Badge key={i} variant="info" className="gap-1">
                    {test.name}
                    <button type="button" onClick={() => removeLabTest(i)} className="ml-1 hover:text-destructive">&times;</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Order Imaging</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select value={newImaging.modality} onChange={(e) => setNewImaging({ ...newImaging, modality: e.target.value })}
                className="rounded-md border bg-background px-3 py-2 text-sm">
                <option value="xray">X-Ray</option>
                <option value="mri">MRI</option>
                <option value="ct">CT Scan</option>
                <option value="ultrasound">Ultrasound</option>
                <option value="mammography">Mammography</option>
                <option value="other">Other</option>
              </select>
              <Input placeholder="Body part (e.g. Chest)" value={newImaging.body_part}
                onChange={(e) => setNewImaging({ ...newImaging, body_part: e.target.value })} />
              <Input placeholder="Indication (optional)" value={newImaging.indication}
                onChange={(e) => setNewImaging({ ...newImaging, indication: e.target.value })} />
              <Button type="button" variant="outline" onClick={addImagingOrder}>Add</Button>
            </div>
            {imagingOrders.length > 0 && (
              <div className="space-y-1.5">
                {imagingOrders.map((img, i) => (
                  <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <span>{img.modality.toUpperCase()} — {img.body_part} {img.indication && `(${img.indication})`}</span>
                    <button type="button" onClick={() => removeImagingOrder(i)} className="text-muted-foreground hover:text-destructive">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <Input label={t("doctorPrescriptions.doctorNotes")} placeholder={t("doctorPrescriptions.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving || !patient}>
              {saving ? t("doctorPrescriptions.saving") : t("doctorPrescriptions.saveAndSend")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>{t("common.cancel")}</Button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}

export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-muted-foreground">Loading...</div>}>
      <PrescriptionForm />
    </Suspense>
  );
}
