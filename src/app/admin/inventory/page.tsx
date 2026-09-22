"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InventoryItem, Supplier, PurchaseOrder } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import { Plus, Trash2, Package } from "lucide-react";

type Tab = "items" | "suppliers" | "purchase" | "expiry";
type FormData = {
  name: string; category: string; quantity: number; unit: string;
  price_per_unit: number; minimum_stock: number;
  supplier: string; expiry_date: string; batch_number: string;
};
const emptyForm: FormData = {
  name: "", category: "", quantity: 0, unit: "",
  price_per_unit: 0, minimum_stock: 0,
  supplier: "", expiry_date: "", batch_number: "",
};

interface POLine { item_id: string; quantity: number; unit_price: number; }

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function AdminInventoryPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", contact_person: "", phone: "", email: "", address: "", gstin: "" });
  const [showPOForm, setShowPOForm] = useState(false);
  const [poSupplier, setPoSupplier] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poLines, setPoLines] = useState<POLine[]>([{ item_id: "", quantity: 1, unit_price: 0 }]);
  const { addToast } = useToast();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();
    const [inv, supRes, poRes] = await Promise.all([
      supabase.from("inventory_items").select("*").order("name"),
      fetch("/api/inventory/suppliers").then(r => r.json()).catch(() => ({ suppliers: [] })),
      fetch("/api/inventory/purchase-orders").then(r => r.json()).catch(() => ({ purchase_orders: [] })),
    ]);
    setItems((inv.data as InventoryItem[]) || []);
    setSuppliers(supRes.suppliers || []);
    setPos(poRes.purchase_orders || []);
    setLoading(false);
  }

  function resetForm() { setForm(emptyForm); setEditId(null); setShowForm(false); }

  function openEdit(item: InventoryItem) {
    setEditId(item.id);
    setForm({
      name: item.name, category: item.category, quantity: item.quantity, unit: item.unit,
      price_per_unit: item.price_per_unit, minimum_stock: item.minimum_stock,
      supplier: item.supplier || "", expiry_date: item.expiry_date || "", batch_number: item.batch_number || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/inventory/${editId}` : "/api/inventory";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.json().then(d => d.error || t("inventory.saveFailed")));
      addToast("success", editId ? t("inventory.updateItem") : t("inventory.createItem"));
      resetForm();
      loadAll();
    } catch (err: unknown) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/inventory/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      addToast("success", t("inventory.deletedSuccess"));
      loadAll();
    } catch {
      addToast("error", t("inventory.deleteFailed"));
    }
    setDeleteId(null);
  }

  async function handleSupplier(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("purchase.saveFailed"));
      addToast("success", t("purchase.supplierAdded"));
      setShowSupplierForm(false);
      setSupplierForm({ name: "", contact_person: "", phone: "", email: "", address: "", gstin: "" });
      loadAll();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePO(e: React.FormEvent) {
    e.preventDefault();
    const valid = poLines.filter(l => l.item_id && l.quantity > 0);
    if (valid.length === 0) { addToast("error", t("purchase.addItemsFirst")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier_id: poSupplier || null, notes: poNotes, items: valid }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("purchase.createFailed"));
      addToast("success", t("purchase.createSuccess"));
      setShowPOForm(false);
      setPoNotes("");
      setPoLines([{ item_id: "", quantity: 1, unit_price: 0 }]);
      loadAll();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function receivePO(id: string) {
    try {
      const res = await fetch(`/api/inventory/purchase-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("purchase.actionFailed"));
      addToast("success", t("purchase.receiveSuccess"));
      loadAll();
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  const expiring = items.filter(i => i.expiry_date && daysUntil(i.expiry_date) <= 30);
  const lowStock = items.filter(i => i.quantity <= i.minimum_stock);

  const tabs: { id: Tab; label: string }[] = [
    { id: "items", label: t("inventory.title") },
    { id: "expiry", label: `${t("inventory.expiryTab")} (${expiring.length})` },
    { id: "suppliers", label: t("purchase.suppliers") },
    { id: "purchase", label: t("purchase.title") },
  ];

  if (loading) return <div><Skeleton lines={8} /></div>;

  return (
    <div>
      <PageHeader
        title={t("inventory.title")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSupplierForm(true)}>{t("purchase.addSupplier")}</Button>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>{t("inventory.addItem")}</Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === tb.id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "items" && (
        <>
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-semibold">{editId ? t("inventory.updateItem") : t("inventory.createItem")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input placeholder={t("inventory.itemName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input placeholder={t("inventory.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
                <Input type="number" min={0} placeholder={t("inventory.qty")} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
                <Input placeholder={t("inventory.unit")} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
                <Input type="number" step="0.01" min={0} placeholder={t("inventory.pricePerUnit")} value={form.price_per_unit} onChange={(e) => setForm({ ...form, price_per_unit: Number(e.target.value) })} required />
                <Input type="number" min={0} placeholder={t("inventory.minimumStock")} value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: Number(e.target.value) })} required />
                <Input placeholder={t("inventory.supplier")} value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
                <Input type="date" label={t("inventory.expiryDate")} value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
                <Input placeholder={t("inventory.batchNumber")} value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? t("inventory.saving") : (editId ? t("inventory.updateItem") : t("inventory.createItem"))}</Button>
                <Button type="button" variant="ghost" onClick={resetForm}>{t("common.cancel")}</Button>
              </div>
            </form>
          )}

          {items.length === 0 ? (
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
                    <th className="px-4 py-3 text-left font-medium">{t("inventory.batchNumber")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("inventory.expiryDate")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.category}</td>
                      <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3">₹{item.price_per_unit}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.batch_number || "—"}</td>
                      <td className="px-4 py-3 text-xs">{item.expiry_date || "—"}</td>
                      <td className="px-4 py-3">
                        {item.expiry_date && daysUntil(item.expiry_date) <= 0 ? (
                          <Badge variant="destructive">{t("inventory.expired")}</Badge>
                        ) : item.expiry_date && daysUntil(item.expiry_date) <= 7 ? (
                          <Badge variant="destructive">{t("inventory.expiringSoon")}</Badge>
                        ) : item.quantity <= item.minimum_stock ? (
                          <Badge variant="destructive">{t("inventory.lowStock")}</Badge>
                        ) : (
                          <Badge variant="success">{t("inventory.inStock")}</Badge>
                        )}
                      </td>
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
        </>
      )}

      {tab === "expiry" && (
        <>
          <div className="mb-4 flex gap-3">
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <span className="text-muted-foreground">{t("inventory.expiringSoon")}: </span>
              <strong className="text-amber-600">{expiring.filter(i => daysUntil(i.expiry_date!) > 0).length}</strong>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <span className="text-muted-foreground">{t("inventory.expired")}: </span>
              <strong className="text-red-600">{expiring.filter(i => daysUntil(i.expiry_date!) <= 0).length}</strong>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <span className="text-muted-foreground">{t("inventory.lowStock")}: </span>
              <strong className="text-red-600">{lowStock.length}</strong>
            </div>
          </div>
          {expiring.length === 0 && lowStock.length === 0 ? (
            <EmptyState title={t("inventory.noExpiryAlerts")} description={t("ui.noData")} />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("inventory.itemName")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("inventory.batchNumber")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("inventory.expiryDate")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("inventory.qty")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...new Set([...expiring, ...lowStock])].map(item => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{item.batch_number || "—"}</td>
                      <td className="px-4 py-3 text-xs">{item.expiry_date || "—"}</td>
                      <td className="px-4 py-3">{item.quantity} {item.unit}</td>
                      <td className="px-4 py-3">
                        {item.expiry_date && daysUntil(item.expiry_date) <= 0 ? (
                          <Badge variant="destructive">{t("inventory.expired")}</Badge>
                        ) : item.expiry_date && daysUntil(item.expiry_date) <= 7 ? (
                          <Badge variant="destructive">{t("inventory.expiringSoon")}</Badge>
                        ) : item.expiry_date && daysUntil(item.expiry_date) <= 30 ? (
                          <Badge variant="warning">{t("inventory.expiring30")}</Badge>
                        ) : (
                          <Badge variant="destructive">{t("inventory.lowStock")}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "suppliers" && (
        <>
          <div className="mb-4">
            <Button onClick={() => setShowSupplierForm(true)}><Plus size={14} className="mr-1" />{t("purchase.addSupplier")}</Button>
          </div>
          {suppliers.length === 0 ? (
            <EmptyState title={t("purchase.noSuppliers")} description={t("ui.noData")} />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("purchase.contact")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.phone")}</th>
                    <th className="px-4 py-3 text-left font-medium">GSTIN</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.contact_person || "—"}</td>
                      <td className="px-4 py-3">{s.phone || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.gstin || "—"}</td>
                      <td className="px-4 py-3"><Badge variant={s.is_active ? "success" : "muted"}>{s.is_active ? t("inventory.inStock") : t("common.status")}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "purchase" && (
        <>
          <div className="mb-4">
            <Button onClick={() => setShowPOForm(true)}><Plus size={14} className="mr-1" />{t("purchase.newPO")}</Button>
          </div>
          {pos.length === 0 ? (
            <EmptyState title={t("purchase.noPOs")} description={t("ui.noData")} action={<Button onClick={() => setShowPOForm(true)}>{t("purchase.newPO")}</Button>} />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("purchase.poNumber")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("purchase.supplier")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("pharmacy.total")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.date")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map(po => (
                    <tr key={po.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{po.po_number}</td>
                      <td className="px-4 py-3">{po.supplier?.name || "—"}</td>
                      <td className="px-4 py-3">₹{po.total_amount}</td>
                      <td className="px-4 py-3">
                        <Badge variant={po.status === "received" ? "success" : po.status === "cancelled" ? "destructive" : "info"}>{po.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(po.created_at).toLocaleDateString("en-IN")}</td>
                      <td className="px-4 py-3">
                        {po.status === "ordered" && (
                          <button onClick={() => receivePO(po.id)} className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90">
                            <Package size={12} className="mr-1 inline" />{t("purchase.receive")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t("inventory.deleteConfirm")} footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
        </>
      }>
        <p>{t("inventory.deleteConfirmMsg") || t("inventory.deleteConfirm")}</p>
      </Modal>

      <Modal open={showSupplierForm} onOpenChange={setShowSupplierForm} title={t("purchase.addSupplier")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowSupplierForm(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => handleSupplier(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={handleSupplier} className="space-y-3">
          <Input label={t("common.name")} value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} required />
          <Input label={t("purchase.contact")} value={supplierForm.contact_person} onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })} />
          <Input label={t("common.phone")} value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
          <Input label={t("common.email")} value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
          <Input label="GSTIN" value={supplierForm.gstin} onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })} />
        </form>
      </Modal>

      <Modal open={showPOForm} onOpenChange={setShowPOForm} title={t("purchase.newPO")} size="lg" footer={
        <>
          <Button variant="ghost" onClick={() => setShowPOForm(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => handlePO(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("purchase.createPO")}</Button>
        </>
      }>
        <form onSubmit={handlePO} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1">{t("purchase.supplier")}</label>
            <select value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">{t("purchase.selectSupplier")}</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">{t("requisition.items")}</label>
            {poLines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <select
                  value={line.item_id}
                  onChange={(e) => setPoLines(prev => prev.map((l, idx) => idx === i ? { ...l, item_id: e.target.value } : l))}
                  className="col-span-6 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                >
                  <option value="">{t("pharmacy.selectItem")}</option>
                  {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <input
                  type="number" min={1} value={line.quantity}
                  onChange={(e) => setPoLines(prev => prev.map((l, idx) => idx === i ? { ...l, quantity: Number(e.target.value) } : l))}
                  className="col-span-2 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                  placeholder={t("inventory.qty")}
                />
                <input
                  type="number" min={0} step="0.01" value={line.unit_price}
                  onChange={(e) => setPoLines(prev => prev.map((l, idx) => idx === i ? { ...l, unit_price: Number(e.target.value) } : l))}
                  className="col-span-3 rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
                  placeholder={t("inventory.unitPrice")}
                />
                <button type="button" onClick={() => setPoLines(prev => prev.filter((_, idx) => idx !== i))} className="col-span-1 text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setPoLines([...poLines, { item_id: "", quantity: 1, unit_price: 0 }])} className="text-xs text-primary hover:underline">
              + {t("requisition.addItem")}
            </button>
          </div>

          <Input label={t("requisition.notes")} value={poNotes} onChange={(e) => setPoNotes(e.target.value)} />
        </form>
      </Modal>
    </div>
  );
}
