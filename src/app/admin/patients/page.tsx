"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient } from "@/types/database";

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", gender: "male" as Patient["gender"], phone: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    setPatients((data as Patient[]) || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: "", dob: "", gender: "male", phone: "", address: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(p: Patient) {
    setForm({ name: p.name, dob: p.dob, gender: p.gender, phone: p.phone, address: p.address });
    setEditingId(p.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    const supabase = createClient();

    if (editingId) {
      const { error: updateError } = await supabase.from("patients").update({ name: form.name, dob: form.dob, gender: form.gender, phone: form.phone, address: form.address }).eq("id", editingId);

      if (updateError) {
        setError(updateError.message);
        setSubmitting(false);
        return;
      }

      setSuccess("Patient updated successfully");
    } else {
      const { error: insertError } = await supabase.from("patients").insert({ name: form.name, dob: form.dob, gender: form.gender, phone: form.phone, address: form.address });

      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }

      setSuccess("Patient created successfully");
    }

    resetForm();
    loadPatients();
    setSubmitting(false);
  }

  async function handleDelete(p: Patient) {
    if (!window.confirm(`Are you sure you want to delete ${p.name}?`)) return;

    setError("");
    setSuccess("");

    const supabase = createClient();
    const { error: deleteError } = await supabase.from("patients").delete().eq("id", p.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSuccess("Patient deleted successfully");
    loadPatients();
  }

  const genderColors: Record<string, string> = {
    male: "bg-blue-100 text-blue-800",
    female: "bg-pink-100 text-pink-800",
    other: "bg-purple-100 text-purple-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Patient Management</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          + Add Patient
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {success && <p className="mb-4 text-sm text-green-600">{success}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? "Edit Patient" : "Add New Patient"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            <input type="date" placeholder="Date of Birth" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Patient["gender"] })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm sm:col-span-2" required />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Patient" : "Create Patient")}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading patients...</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">UHID</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">DOB</th>
                <th className="px-4 py-3 text-left font-medium">Gender</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.uhid}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.dob}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${genderColors[p.gender] || "bg-gray-100"}`}>
                      {p.gender}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(p)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p)} className="rounded-lg border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No patients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
