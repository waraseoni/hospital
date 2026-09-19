"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InventoryItem } from "@/types/database";
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

type FormData = { name: string; category: string; quantity: number; unit: string; price_per_unit: number; minimum_stock: number };
const emptyForm: FormData = { name: "", category: "", quantity: 0, unit: "", price_per_unit: 0, minimum_stock: 0 };

export default function AdminInventoryPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("inventory_items").select("*").order("name");
    setItems(data || []);
    setLoading(false);
  }

  function resetForm() { setForm(emptyForm); setEditId(null); setShowForm(false); }

  function openEdit(item: InventoryItem) {
    setEditId(item.id);
    setForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, price_per_unit: item.price_per_unit, minimum_stock: item.minimum_stock });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/inventory/${editId}` : "/api/inventory";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error(await res.json().then(d => d.error || t("inventory.saveFailed")));
      addToast("success", editId ? t("inventory.updateItem") : t("inventory.createItem"));
      resetForm();
      loadItems();
    } catch (err: unknown) { addToast("error", (err as Error).message); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/inventory/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      addToast("success", t("inventory.deletedSuccess"));
      loadItems();
    } catch { addToast("error", t("inventory.deleteFailed")); }
    setDeleteId(null);
  }

  return (
    <div>
      <PageHeader title={t("inventory.title")} actions={<Button onClick={() => { resetForm(); setShowForm(true); }}>{t("inventory.addItem")}</Button>} />

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editId ? t("inventory.updateItem") : t("inventory.createItem")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder={t("inventory.itemName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder={t("inventory.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            <Input type="number" min={0} placeholder={t("inventory.qty")} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
            <Input placeholder={t("inventory.unit")} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
            <Input type="number" step="0.01" min={0} placeholder={t("inventory.pricePerUnit")} value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: Number(e.target.value) })} required />
            <Input type="number" min={0} placeholder={t("inventory.minimumStock")} value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: Number(e.target.value) })} required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? t("inventory.saving") : (editId ? t("inventory.updateItem") : t("inventory.createItem"))}</Button>
            <Button type="button" variant="ghost" onClick={resetForm}>{t("common.cancel")}</Button>
          </div>
        </form>
      )}

      {loading ? <Skeleton lines={5} /> : items.length === 0 ? (
        <EmptyState title={t("inventory.noItems")} description={t("ui.noData")} action={<Button onClick={() => { resetForm(); setShowForm(true); }}>{t("inventory.addItem")}</Button>} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("inventory.itemName")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("inventory.category")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("inventory.qty")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("inventory.unitPrice")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("inventory.status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("inventory.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                  <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                  <td className="px-4 py-3">₹{item.price_per_unit}</td>
                  <td className="px-4 py-3"><Badge variant={item.quantity <= item.minimum_stock ? "destructive" : "success"}>{item.quantity <= item.minimum_stock ? t("inventory.lowStock") : t("inventory.inStock")}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted">{t("common.edit")}</button>
                      <button onClick={() => setDeleteId(item.id)} className="rounded-lg border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10">{t("common.delete")}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t("inventory.deleteConfirm")} footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
        </>
      }>
        <p>{t("inventory.deleteConfirmMsg") || t("inventory.deleteConfirm")}</p>
      </Modal>
    </div>
  );
}
