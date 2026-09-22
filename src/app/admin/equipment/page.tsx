"use client";

import { useEffect, useState } from "react";
import type { Equipment, MaintenanceLog } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, Wrench } from "lucide-react";

type Tab = "equipment" | "logs";

export default function AdminEquipmentPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("equipment");
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "general", department: "", asset_tag: "", manufacturer: "", model: "", location: "", status: "operational", purchase_date: "", warranty_until: "" });
  const [logEquip, setLogEquip] = useState<Equipment | null>(null);
  const [logForm, setLogForm] = useState({ maintenance_type: "service", description: "", cost: 0, performed_by: "", next_due: "" });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const data = await fetch("/api/equipment").then(r => r.json()).catch(() => ({ equipment: [], logs: [] }));
    setEquipment(data.equipment || []);
    setLogs(data.logs || []);
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm({ name: "", category: "general", department: "", asset_tag: "", manufacturer: "", model: "", location: "", status: "operational", purchase_date: "", warranty_until: "" });
    setShowForm(true);
  }

  function openEdit(eq: Equipment) {
    setEditId(eq.id);
    setForm({
      name: eq.name, category: eq.category, department: eq.department, asset_tag: eq.asset_tag || "",
      manufacturer: eq.manufacturer, model: eq.model, location: eq.location, status: eq.status,
      purchase_date: eq.purchase_date || "", warranty_until: eq.warranty_until || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { id: editId, ...form } : form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", editId ? t("equipment.updated") : t("equipment.created"));
      setShowForm(false);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    if (!logEquip) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "log", equipment_id: logEquip.id, ...logForm, next_due: logForm.next_due || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("equipment.logSaved"));
      setLogEquip(null);
      setLogForm({ maintenance_type: "service", description: "", cost: 0, performed_by: "", next_due: "" });
      load();
      setTab("logs");
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch("/api/equipment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) { addToast("success", t("equipment.updated")); load(); }
  }

  const statusVariant = (s: string) =>
    s === "operational" ? "success" : s === "maintenance" || s === "repair" ? "warning" : s === "retired" ? "muted" : "info";

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("equipment.title")}
        subtitle={t("equipment.subtitle")}
        actions={<Button onClick={openCreate}><Plus size={14} className="mr-1" />{t("equipment.add")}</Button>}
      />

      <div className="flex gap-2 mb-5">
        {([["equipment", t("equipment.title")], ["logs", t("equipment.logs")]] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "equipment" && (
        equipment.length === 0 ? (
          <EmptyState title={t("equipment.none")} description={t("ui.noData")} action={<Button onClick={openCreate}>{t("equipment.add")}</Button>} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("equipment.tag")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("requisition.department")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("equipment.location")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("equipment.warranty")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map(eq => (
                  <tr key={eq.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{eq.name}<div className="text-xs text-muted-foreground">{eq.category}</div></td>
                    <td className="px-4 py-3 font-mono text-xs">{eq.asset_tag || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{eq.department || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{eq.location || "—"}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(eq.status) as "success" | "warning" | "muted" | "info"}>{eq.status}</Badge></td>
                    <td className="px-4 py-3 text-xs">{eq.warranty_until || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => openEdit(eq)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">{t("common.edit")}</button>
                        <button onClick={() => setLogEquip(eq)} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted flex items-center gap-1"><Wrench size={11} />{t("equipment.log")}</button>
                        {eq.status !== "retired" && (
                          <button onClick={() => setStatus(eq.id, "retired")} className="rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">{t("equipment.retire")}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "logs" && (
        logs.length === 0 ? (
          <EmptyState title={t("equipment.noLogs")} description={t("ui.noData")} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("equipment.equipment")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("equipment.logType")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("requisition.notes")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("billing.amount")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.date")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{l.equipment?.name || "—"}</td>
                    <td className="px-4 py-3"><Badge variant="info">{l.maintenance_type}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[240px] truncate">{l.description}</td>
                    <td className="px-4 py-3">₹{l.cost}</td>
                    <td className="px-4 py-3 text-xs">{l.performed_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal open={showForm} onOpenChange={setShowForm} title={editId ? t("common.edit") : t("equipment.add")} size="lg" footer={
        <>
          <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <Input label={t("common.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label={t("inventory.category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <Input label={t("requisition.department")} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <Input label={t("equipment.tag")} value={form.asset_tag} onChange={(e) => setForm({ ...form, asset_tag: e.target.value })} />
          <Input label={t("equipment.manufacturer")} value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
          <Input label={t("equipment.model")} value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <Input label={t("equipment.location")} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <div>
            <label className="text-xs font-medium block mb-1">{t("common.status")}</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {["operational", "maintenance", "repair", "reserved", "retired"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input type="date" label={t("equipment.purchaseDate")} value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
          <Input type="date" label={t("equipment.warranty")} value={form.warranty_until} onChange={(e) => setForm({ ...form, warranty_until: e.target.value })} />
        </form>
      </Modal>

      <Modal open={!!logEquip} onOpenChange={() => setLogEquip(null)} title={t("equipment.log")} footer={
        <>
          <Button variant="ghost" onClick={() => setLogEquip(null)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => submitLog(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={submitLog} className="space-y-3">
          <p className="text-sm font-medium">{logEquip?.name}</p>
          <div>
            <label className="text-xs font-medium block mb-1">{t("equipment.logType")}</label>
            <select value={logForm.maintenance_type} onChange={(e) => setLogForm({ ...logForm, maintenance_type: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {["service", "repair", "calibration", "inspection"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label={t("requisition.notes")} value={logForm.description} onChange={(e) => setLogForm({ ...logForm, description: e.target.value })} required />
          <Input type="number" label={t("billing.amount")} value={logForm.cost} onChange={(e) => setLogForm({ ...logForm, cost: Number(e.target.value) })} />
          <Input label={t("equipment.performedBy")} value={logForm.performed_by} onChange={(e) => setLogForm({ ...logForm, performed_by: e.target.value })} />
          <Input type="date" label={t("equipment.nextDue")} value={logForm.next_due} onChange={(e) => setLogForm({ ...logForm, next_due: e.target.value })} />
        </form>
      </Modal>
    </PageContainer>
  );
}
