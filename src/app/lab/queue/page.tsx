"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LabReport, Patient } from "@/types/database";
import Link from "next/link";

export default function LabQueuePage() {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newTestName, setNewTestName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadReports(); loadPatients(); }, []);

  async function loadReports() {
    const supabase = createClient();
    const { data } = await supabase.from("lab_reports").select("*, patient:patients(name, uhid)").order("created_at", { ascending: false });
    setReports((data as LabReport[]) || []);
    setLoading(false);
  }

  async function loadPatients() {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("name");
    setPatients((data as Patient[]) || []);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newPatientId || !newTestName.trim()) return;
    setCreating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("lab_reports").insert({
      patient_id: newPatientId,
      test_name: newTestName.trim(),
      test_category: "general",
      ordered_by: user?.id || null,
      status: "pending",
      test_data: {},
      normal_ranges: {},
      notes: newNotes.trim() || null,
    });

    setNewPatientId("");
    setNewTestName("");
    setNewNotes("");
    setShowForm(false);
    setCreating(false);
    loadReports();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this pending lab report?")) return;
    const supabase = createClient();
    await supabase.from("lab_reports").delete().eq("id", id);
    loadReports();
  }

  const pending = reports.filter(r => r.status === "pending");
  const inProgress = reports.filter(r => r.status === "in_progress");
  const finalized = reports.filter(r => r.status === "finalized");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Lab Test Queue</h1>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          {showForm ? "Cancel" : "+ New Lab Report"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-card p-6 mb-6 space-y-4">
          <h2 className="font-semibold">Create Lab Report</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Patient *</label>
            <select value={newPatientId} onChange={(e) => setNewPatientId(e.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Test Name *</label>
            <input value={newTestName} onChange={(e) => setNewTestName(e.target.value)} required placeholder="e.g. CBC, Blood Sugar..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={2} placeholder="Additional notes..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button type="submit" disabled={creating} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {creating ? "Creating..." : "Create Report"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading queue...</div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3 text-orange-600">Pending ({pending.length})</h2>
            <div className="space-y-2">
              {pending.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <p className="font-medium">{r.test_name}</p>
                    <p className="text-xs text-muted-foreground">Patient: {r.patient?.name} | UHID: {r.patient?.uhid}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/lab/reports/${r.id}`} className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90">
                      Enter Results
                    </Link>
                    <button onClick={() => handleDelete(r.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && <p className="text-sm text-muted-foreground">No pending tests</p>}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-blue-600">In Progress ({inProgress.length})</h2>
            <div className="space-y-2">
              {inProgress.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <p className="font-medium">{r.test_name}</p>
                    <p className="text-xs text-muted-foreground">Patient: {r.patient?.name}</p>
                  </div>
                  <Link href={`/lab/reports/${r.id}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700">
                    Complete Report
                  </Link>
                </div>
              ))}
              {inProgress.length === 0 && <p className="text-sm text-muted-foreground">No tests in progress</p>}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3 text-green-600">Finalized ({finalized.length})</h2>
            <div className="space-y-2">
              {finalized.slice(0, 10).map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                  <div>
                    <p className="font-medium">{r.test_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  {r.pdf_url && (
                    <a href={r.pdf_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">View PDF</a>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
