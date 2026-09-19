"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient, VitalsRecord } from "@/types/database";
import { useI18n } from "@/i18n/provider";

export default function NurseVitalsPage() {
  const { t } = useI18n();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bp_systolic: "", bp_diastolic: "", pulse: "", spo2: "", temperature: "",
    weight: "", height: "", respiratory_rate: "", pain_scale: "", notes: "",
  });

  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("patients").select("*").order("name");
      setPatients(data || []);
      setLoading(false);
    }
    load();
    loadRecords();
  }, []);

  async function loadRecords() {
    setRecordsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("vitals_records")
      .select("*, patient:patients(name, uhid)")
      .order("created_at", { ascending: false })
      .limit(20);
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

    await supabase.from("vitals_records").insert({
      patient_id: selectedPatient,
      nurse_id: user.id,
      bp_systolic: parseInt(form.bp_systolic),
      bp_diastolic: parseInt(form.bp_diastolic),
      pulse: parseInt(form.pulse),
      spo2: parseInt(form.spo2),
      temperature: parseFloat(form.temperature),
      weight: form.weight ? parseFloat(form.weight) : null,
      height: form.height ? parseFloat(form.height) : null,
      respiratory_rate: form.respiratory_rate ? parseInt(form.respiratory_rate) : null,
      pain_scale: form.pain_scale ? parseInt(form.pain_scale) : null,
      notes: form.notes || null,
    });

    setForm({ bp_systolic: "", bp_diastolic: "", pulse: "", spo2: "", temperature: "", weight: "", height: "", respiratory_rate: "", pain_scale: "", notes: "" });
    setSelectedPatient("");
    setSaving(false);
    alert("Vitals recorded successfully!");
    loadRecords();
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("vitals.deleteConfirm"))) return;
    const supabase = createClient();
    await supabase.from("vitals_records").delete().eq("id", id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t("vitals.title")}</h1>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("vitals.selectPatient")}</h2>
          <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required>
            <option value="">{t("vitals.selectPatientPlaceholder")}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("vitals.vitalSigns")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.bpSystolic")} *</label>
              <input type="number" placeholder="120" value={form.bp_systolic} onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.bpDiastolic")} *</label>
              <input type="number" placeholder="80" value={form.bp_diastolic} onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.pulse")} *</label>
              <input type="number" placeholder="72" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.spo2")} *</label>
              <input type="number" placeholder="98" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.temperature")} *</label>
              <input type="number" step="0.1" placeholder="98.6" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.painScale")}</label>
              <input type="number" min="0" max="10" placeholder="0" value={form.pain_scale} onChange={(e) => setForm({ ...form, pain_scale: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("vitals.additionalMeasurements")}</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.weight")}</label>
              <input type="number" step="0.1" placeholder="70" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.height")}</label>
              <input type="number" step="0.1" placeholder="170" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">{t("vitals.respiratoryRate")}</label>
              <input type="number" placeholder="16" value={form.respiratory_rate} onChange={(e) => setForm({ ...form, respiratory_rate: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">{t("vitals.notes")}</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder={t("vitals.notesPlaceholder")} />
          </div>
        </div>

        <button type="submit" disabled={saving || !selectedPatient} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? "Saving..." : t("vitals.recordVitals")}
        </button>
      </form>

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">{t("vitals.recentVitals")}</h2>
        {recordsLoading ? (
          <div className="animate-pulse text-muted-foreground text-sm">{t("vitals.loadingRecords")}</div>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("vitals.noVitals")}</p>
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
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.patient?.name}</span>
                      <span className="ml-1.5 text-muted-foreground text-xs">({r.patient?.uhid})</span>
                    </td>
                    <td className="px-4 py-3">{r.bp_systolic}/{r.bp_diastolic}</td>
                    <td className="px-4 py-3">{r.pulse} bpm</td>
                    <td className="px-4 py-3">{r.spo2}%</td>
                    <td className="px-4 py-3">{r.temperature}°C</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(r.id)} className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
