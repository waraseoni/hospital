"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { PageHeader } from "@/components/ui/page";
import { Plus } from "lucide-react";

const roleMap: Record<string, "info" | "success" | "warning" | "destructive"> = {
  doctor: "info",
  nurse: "success",
  lab: "warning",
  staff: "destructive",
};

const staffRoles = ["doctor", "nurse", "lab", "staff"];

export default function SuperAdminStaffPage() {
  const { t } = useI18n();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", role: "doctor" as Profile["role"], email: "", password: "", specialization: "" });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { addToast } = useToast();

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("*").in("role", staffRoles).order("full_name");
    setStaff((data as Profile[]) || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ full_name: "", phone: "", role: "doctor", email: "", password: "", specialization: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(s: Profile) {
    setForm({ full_name: s.full_name, phone: s.phone || "", role: s.role, email: s.email || "", password: "", specialization: s.specialization || "" });
    setEditingId(s.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { full_name: form.full_name, phone: form.phone, role: form.role, email: form.email, specialization: form.specialization };
      const url = editingId ? `/api/staff/${editingId}` : "/api/staff";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", editingId ? "Updated" : "Created");
      resetForm();
      loadStaff();
    } catch (err: unknown) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/staff/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      addToast("success", "Deleted");
      loadStaff();
    } catch { addToast("error", "Delete failed"); }
    setDeleteId(null);
  }

  const filtered = staff.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Staff Management" actions={<Button onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} className="mr-1" />Add Staff</Button>} />

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? "Edit Staff" : "Add New Staff"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            {!editingId && <Input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />}
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Profile["role"] })} options={[{ value: "doctor", label: "Doctor" }, { value: "nurse", label: "Nurse" }, { value: "lab", label: "Lab Tech" }, { value: "staff", label: "Staff" }]} />
            {form.role === "doctor" && <Input placeholder="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? (editingId ? "Updating..." : "Creating...") : (editingId ? "Update" : "Create")}</Button>
            <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, or role..." />
      </div>

      {loading ? <Skeleton lines={5} /> : filtered.length === 0 ? (
        <EmptyState title="No staff found" description="No staff match the current filters" />
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
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{s.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={roleMap[s.role] || "default"}>{s.role}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{s.specialization || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(s)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted">Edit</button>
                      <button onClick={() => setDeleteId(s.id)} className="rounded-lg border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Staff" footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </>
      }>
        <p>Are you sure you want to delete this staff member?</p>
      </Modal>
    </div>
  );
}
