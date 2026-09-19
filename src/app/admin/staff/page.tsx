"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", role: "doctor" as Profile["role"], email: "", password: "", specialization: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").in("role", ["doctor", "nurse", "lab", "staff"]).order("full_name");
    setStaff((data as Profile[]) || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ full_name: "", phone: "", role: "doctor", email: "", password: "", specialization: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(s: Profile) {
    setForm({
      full_name: s.full_name,
      phone: s.phone || "",
      role: s.role,
      email: s.email || "",
      password: "",
      specialization: s.specialization || "",
    });
    setEditingId(s.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (editingId) {
      const body: Record<string, unknown> = {
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
        email: form.email,
        specialization: form.specialization,
      };

      const res = await fetch(`/api/staff/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update staff");
        setSubmitting(false);
        return;
      }

      setSuccess("Staff member updated successfully");
      resetForm();
      loadStaff();
      setSubmitting(false);
    } else {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create staff");
        setSubmitting(false);
        return;
      }

      setSuccess("Staff member created successfully");
      resetForm();
      loadStaff();
      setSubmitting(false);
    }
  }

  async function handleDelete(s: Profile) {
    if (!window.confirm(`Are you sure you want to delete ${s.full_name}?`)) return;

    setError("");
    setSuccess("");

    const res = await fetch(`/api/staff/${s.id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to delete staff");
      return;
    }

    setSuccess("Staff member deleted successfully");
    loadStaff();
  }

  const roleColors: Record<string, string> = {
    doctor: "bg-blue-100 text-blue-800",
    nurse: "bg-green-100 text-green-800",
    lab: "bg-purple-100 text-purple-800",
    staff: "bg-orange-100 text-orange-800",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          + Add Staff
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {success && <p className="mb-4 text-sm text-green-600">{success}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? "Edit Staff" : "Add New Staff"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            {!editingId && (
              <input placeholder="Password (min 6 chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required minLength={6} />
            )}
            <input placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Profile["role"] })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="doctor">Doctor</option>
              <option value="nurse">Nurse</option>
              <option value="lab">Lab Technician</option>
              <option value="staff">Staff</option>
            </select>
            {form.role === "doctor" && (
              <input placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update Staff" : "Create Account")}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading staff...</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Specialization</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{s.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${roleColors[s.role] || "bg-gray-100"}`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.specialization || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(s)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(s)} className="rounded-lg border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No staff members found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
