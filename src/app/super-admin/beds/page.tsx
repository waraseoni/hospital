"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Bed } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import { Plus, BedDouble } from "lucide-react";

export default function SuperAdminBedsPage() {
  const { t } = useI18n();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ward_name: "", bed_number: "", bed_type: "general" as Bed["bed_type"], daily_rate: 0 });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadBeds(); }, []);

  async function loadBeds() {
    const supabase = createClient();
    const { data } = await supabase.from("beds").select("*").order("ward_name");
    setBeds((data as Bed[]) || []);
    setLoading(false);
  }

  function openCreate() { setEditId(null); setForm({ ward_name: "", bed_number: "", bed_type: "general", daily_rate: 0 }); setShowForm(true); }
  function openEdit(b: Bed) { setEditId(b.id); setForm({ ward_name: b.ward_name, bed_number: b.bed_number, bed_type: b.bed_type, daily_rate: b.daily_rate }); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditId(null); setForm({ ward_name: "", bed_number: "", bed_type: "general", daily_rate: 0 }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/beds/${editId}` : "/api/beds";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.json().then(d => d.error || "Failed"));
      addToast("success", editId ? "Updated" : "Created");
      cancelForm();
      loadBeds();
    } catch (err: unknown) { addToast("error", (err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/beds/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      addToast("success", "Deleted");
      loadBeds();
    } catch { addToast("error", "Delete failed"); }
    setDeleteId(null);
  }

  return (
    <div>
      <PageHeader title="Beds" actions={<Button onClick={openCreate}><Plus size={16} className="mr-1" />Add Bed</Button>} />

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{editId ? "Edit Bed" : "Add Bed"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-sm font-medium">Ward Name</label><Input value={form.ward_name} onChange={(e) => setForm({ ...form, ward_name: e.target.value })} required /></div>
            <div><label className="mb-1 block text-sm font-medium">Bed Number</label><Input value={form.bed_number} onChange={(e) => setForm({ ...form, bed_number: e.target.value })} required /></div>
            <div><label className="mb-1 block text-sm font-medium">Type</label><Select value={form.bed_type} onChange={(e) => setForm({ ...form, bed_type: e.target.value as Bed["bed_type"] })} options={[{ value: "general", label: "General" }, { value: "semi_private", label: "Semi Private" }, { value: "private", label: "Private" }, { value: "icu", label: "ICU" }, { value: "emergency", label: "Emergency" }]} /></div>
            <div><label className="mb-1 block text-sm font-medium">Daily Rate</label><Input type="number" min={0} value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })} required /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : (editId ? "Update" : "Create")}</Button>
            <Button type="button" variant="ghost" onClick={cancelForm}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? <Skeleton lines={5} /> : beds.length === 0 ? (
        <EmptyState title="No beds" description="No beds found" action={<Button onClick={openCreate}><Plus size={14} className="mr-1" />Add Bed</Button>} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Ward</th>
              <th className="px-4 py-3 text-left font-medium">Bed No</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Rate</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {beds.map((bed) => (
                <tr key={bed.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{bed.ward_name}</td>
                  <td className="px-4 py-3">{bed.bed_number}</td>
                  <td className="px-4 py-3 capitalize">{bed.bed_type.replace("_", " ")}</td>
                  <td className="px-4 py-3"><Badge variant={bed.is_occupied ? "warning" : "success"}>{bed.is_occupied ? "Occupied" : "Available"}</Badge></td>
                  <td className="px-4 py-3">₹{bed.daily_rate}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(bed)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted">Edit</button>
                      <button onClick={() => setDeleteId(bed.id)} className="rounded-lg border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Bed" footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete}>Delete</Button>
        </>
      }>
        <p>Are you sure?</p>
      </Modal>
    </div>
  );
}
