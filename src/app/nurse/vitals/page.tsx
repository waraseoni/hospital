"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient, VitalsRecord } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";

export default function NurseVitalsPage() {
  const { t } = useI18n();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bp_systolic: "", bp_diastolic: "", pulse: "", spo2: "", temperature: "", weight: "", height: "", respiratory_rate: "", pain_scale: "", notes: "" });
  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("name");
    setPatients(data || []);
    setLoading(false);
    loadRecords();
  }

  async function loadRecords() {
    setRecordsLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("vitals_records").select("*, patient:patients(name, uhid)").order("created_at", { ascending: false }).limit(20);
    setRecords((data as VitalsRecord[]) || []);
    setRecordsLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("vitals_records").insert({ patient_id: selectedPatient, nurse_id: user.id, bp_systolic: parseInt(form.bp_systolic), bp_diastolic: parseInt(form.bp_diastolic), pulse: parseInt(form.pulse), spo2: parseInt(form.spo2), temperature: parseFloat(form.temperature), weight: form.weight ? parseFloat(form.weight) : null, height: form.height ? parseFloat(form.height) : null, respiratory_rate: form.respiratory_rate ? parseInt(form.respiratory_rate) : null, pain_scale: form.pain_scale ? parseInt(form.pain_scale) : null, notes: form.notes || null });
    if (!error) { addToast("success", t("vitals.recordedSuccess") || "Vitals recorded"); setForm({ bp_systolic: "", bp_diastolic: "", pulse: "", spo2: "", temperature: "", weight: "", height: "", respiratory_rate: "", pain_scale: "", notes: "" }); setSelectedPatient(""); }
    else addToast("error", "Failed to record vitals");
    setSaving(false);
    loadRecords();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const supabase = createClient();
    await supabase.from("vitals_records").delete().eq("id", deleteId);
    addToast("success", "Deleted");
    setDeleteId(null);
    loadRecords();
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="max-w-4xl">
      <PageHeader title={t("vitals.title")} />
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("vitals.selectPatient")}</h2>
          <Select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} options={[{ value: "", label: t("vitals.selectPatientPlaceholder") }, ...patients.map(p => ({ value: p.id, label: `${p.name} (${p.uhid})` }))]} />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("vitals.vitalSigns")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label={t("vitals.bpSystolic")} type="number" placeholder="120" value={form.bp_systolic} onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })} required />
            <Input label={t("vitals.bpDiastolic")} type="number" placeholder="80" value={form.bp_diastolic} onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })} required />
            <Input label={t("vitals.pulse")} type="number" placeholder="72" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} required />
            <Input label={t("vitals.spo2")} type="number" placeholder="98" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} required />
            <Input label={t("vitals.temperature")} type="number" step="0.1" placeholder="98.6" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} required />
            <Input label={t("vitals.painScale")} type="number" min={0} max={10} placeholder="0" value={form.pain_scale} onChange={(e) => setForm({ ...form, pain_scale: e.target.value })} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("vitals.additionalMeasurements")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label={t("vitals.weight")} type="number" step="0.1" placeholder="70" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            <Input label={t("vitals.height")} type="number" step="0.1" placeholder="170" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} />
            <Input label={t("vitals.respiratoryRate")} type="number" placeholder="16" value={form.respiratory_rate} onChange={(e) => setForm({ ...form, respiratory_rate: e.target.value })} />
          </div>
          <Input label={t("vitals.notes")} placeholder={t("vitals.notesPlaceholder")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <Button type="submit" disabled={saving || !selectedPatient}>{saving ? "Saving..." : t("vitals.recordVitals")}</Button>
      </form>

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">{t("vitals.recentVitals")}</h2>
        {recordsLoading ? <div className="animate-pulse text-muted-foreground text-sm">{t("vitals.loadingRecords")}</div> : records.length === 0 ? (
          <EmptyState title={t("vitals.noVitals")} description={t("ui.noData")} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">{t("vitals.patient")}</th>
                  <th className="px-4 py-3 font-medium">{t("vitals.bp")}</th>
                  <th className="px-4 py-3 font-medium">{t("vitals.pulse")}</th>
                  <th className="px-4 py-3 font-medium">{t("vitals.spo2")}</th>
                  <th className="px-4 py-3 font-medium">{t("vitals.temp")}</th>
                  <th className="px-4 py-3 font-medium">{t("vitals.dateTime")}</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3"><span className="font-medium">{r.patient?.name}</span><span className="ml-1.5 text-muted-foreground text-xs">({r.patient?.uhid})</span></td>
                    <td className="px-4 py-3">{r.bp_systolic}/{r.bp_diastolic}</td>
                    <td className="px-4 py-3">{r.pulse} bpm</td>
                    <td className="px-4 py-3">{r.spo2}%</td>
                    <td className="px-4 py-3">{r.temperature}°C</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3"><button onClick={() => setDeleteId(r.id)} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">{t("common.delete")}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t("vitals.deleteConfirm")} footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
        </>
      }>
        <p>{t("vitals.deleteConfirmMsg") || t("vitals.deleteConfirm")}</p>
      </Modal>
    </div>
  );
}
