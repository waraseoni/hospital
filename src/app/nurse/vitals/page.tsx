"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient, VitalsRecord } from "@/types/database";

export default function NurseVitalsPage() {
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
    if (!window.confirm("Delete this vitals record?")) return;
    const supabase = createClient();
    await supabase.from("vitals_records").delete().eq("id", id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Record Patient Vitals</h1>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Select Patient</h2>
          <select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required>
            <option value="">-- Select Patient --</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Vital Signs</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium mb-1">BP Systolic *</label>
              <input type="number" placeholder="120" value={form.bp_systolic} onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">BP Diastolic *</label>
              <input type="number" placeholder="80" value={form.bp_diastolic} onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pulse (bpm) *</label>
              <input type="number" placeholder="72" value={form.pulse} onChange={(e) => setForm({ ...form, pulse: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">SpO2 (%) *</label>
              <input type="number" placeholder="98" value={form.spo2} onChange={(e) => setForm({ ...form, spo2: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Temperature (°C) *</label>
              <input type="number" step="0.1" placeholder="98.6" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pain Scale (0-10)</label>
              <input type="number" min="0" max="10" placeholder="0" value={form.pain_scale} onChange={(e) => setForm({ ...form, pain_scale: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Additional Measurements</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium mb-1">Weight (kg)</label>
              <input type="number" step="0.1" placeholder="70" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Height (cm)</label>
              <input type="number" step="0.1" placeholder="170" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Respiratory Rate</label>
              <input type="number" placeholder="16" value={form.respiratory_rate} onChange={(e) => setForm({ ...form, respiratory_rate: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Any observations..." />
          </div>
        </div>

        <button type="submit" disabled={saving || !selectedPatient} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving ? "Saving..." : "Record Vitals"}
        </button>
      </form>

      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Recent Vitals</h2>
        {recordsLoading ? (
          <div className="animate-pulse text-muted-foreground text-sm">Loading records...</div>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vitals recorded yet.</p>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Patient</th>
                  <th className="px-4 py-3 font-medium">BP (mmHg)</th>
                  <th className="px-4 py-3 font-medium">Pulse</th>
                  <th className="px-4 py-3 font-medium">SpO2</th>
                  <th className="px-4 py-3 font-medium">Temp</th>
                  <th className="px-4 py-3 font-medium">Date / Time</th>
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
