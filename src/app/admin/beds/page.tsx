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

const bedTypeMap: Record<string, string> = {
  general: "Beds.general",
  semi_private: "Beds.semiPrivate",
  private: "Beds.private",
  icu: "Beds.icu",
  emergency: "Beds.emergency",
};

export default function AdminBedsPage() {
  const { t } = useI18n();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ward_name: "", bed_number: "", bed_type: "general" as Bed["bed_type"], daily_rate: 0 });
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
      const url = editId ? `/api/beds/${editId}` : "/api/beds";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.json().then(d => d.error || t("beds.saveFailed")));
      addToast("success", editId ? t("beds.updateBed") : t("beds.createBed"));
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
      addToast("success", t("beds.deletedSuccess"));
      loadBeds();
    } catch { addToast("error", t("beds.deleteFailed")); }
    setDeleteId(null);
  }

  return (
    <div>
      <PageHeader title={t("beds.title")} actions={<Button onClick={openCreate}>{t("beds.addBed")}</Button>} />

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{editId ? t("beds.editBed") : t("beds.addBed")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("beds.wardName")}</label>
              <Input value={form.ward_name} onChange={(e) => setForm({ ...form, ward_name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("beds.bedNumber")}</label>
              <Input value={form.bed_number} onChange={(e) => setForm({ ...form, bed_number: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("beds.bedType")}</label>
              <Select value={form.bed_type} onChange={(e) => setForm({ ...form, bed_type: e.target.value as Bed["bed_type"] })} options={[{ value: "general", label: t("beds.general") }, { value: "semi_private", label: t("beds.semiPrivate") }, { value: "private", label: t("beds.private") }, { value: "icu", label: t("beds.icu") }, { value: "emergency", label: t("beds.emergency") }]} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("beds.dailyRate")}</label>
              <Input type="number" min={0} value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })} required />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit" disabled={saving}>{saving ? t("beds.saving") : (editId ? t("beds.updateBed") : t("beds.createBed"))}</Button>
            <Button type="button" variant="ghost" onClick={cancelForm}>{t("common.cancel")}</Button>
          </div>
        </form>
      )}

      {loading ? <Skeleton lines={5} /> : beds.length === 0 ? (
        <EmptyState title={t("beds.noBeds")} description={t("ui.noData")} action={<Button onClick={openCreate}>{t("beds.addBed")}</Button>} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("beds.ward")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("beds.bedNo")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("beds.type")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("beds.status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("beds.rate")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {beds.map((bed) => (
                <tr key={bed.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{bed.ward_name}</td>
                  <td className="px-4 py-3">{bed.bed_number}</td>
                  <td className="px-4 py-3 capitalize">{bed.bed_type.replace("_", " ")}</td>
                  <td className="px-4 py-3"><Badge variant={bed.is_occupied ? "warning" : "success"}>{bed.is_occupied ? t("beds.occupied") : t("beds.available")}</Badge></td>
                  <td className="px-4 py-3">₹{bed.daily_rate}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(bed)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted">{t("common.edit")}</button>
                      <button onClick={() => setDeleteId(bed.id)} className="rounded-lg border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10">{t("common.delete")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t("beds.deleteConfirm")} footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
        </>
      }>
        <p>{t("beds.deleteConfirmMsg") || "Are you sure?"}</p>
      </Modal>
    </div>
  );
}
