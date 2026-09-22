"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Requisition, InventoryItem, Profile } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, Trash2 } from "lucide-react";

const DEPARTMENTS = ["OPD", "IPD", "Emergency", "Lab", "Radiology", "Nursing", "Pharmacy", "Admin"];

interface ReqLine { item_id: string; quantity: number; }

export default function RequisitionsPage() {
  const { t } = useI18n();
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [department, setDepartment] = useState("OPD");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReqLine[]>([{ item_id: "", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(prof as Profile | null);
    }
    const [reqs, inv] = await Promise.all([
      fetch("/api/inventory/requisitions").then(r => r.json()).catch(() => ({ requisitions: [] })),
      supabase.from("inventory_items").select("*").order("name"),
    ]);
    setRequisitions(reqs.requisitions || []);
    setInventory((inv.data as InventoryItem[]) || []);
    setLoading(false);
  }

  function addLine() { setLines([...lines, { item_id: "", quantity: 1 }]); }
  function removeLine(i: number) { if (lines.length <= 1) return; setLines(lines.filter((_, idx) => idx !== i)); }
  function updateLine(i: number, field: keyof ReqLine, value: string | number) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = lines.filter(l => l.item_id && l.quantity > 0);
    if (valid.length === 0) { addToast("error", t("requisition.addItemsFirst")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, notes, items: valid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("requisition.createFailed"));
      addToast("success", t("requisition.createSuccess"));
      setShowForm(false);
      setNotes("");
      setLines([{ item_id: "", quantity: 1 }]);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(id: string, action: "approve" | "reject" | "issue") {
    try {
      const res = await fetch(`/api/inventory/requisitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("requisition.actionFailed"));
      const msg =
        action === "approve" ? t("requisition.approveSuccess") :
        action === "reject" ? t("requisition.rejectSuccess") :
        t("requisition.issueSuccess");
      addToast("success", msg);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  const statusVariant = (s: string) =>
    s === "pending" ? "warning" : s === "approved" ? "info" : s === "issued" ? "success" : "destructive";

  const canApprove = profile && (profile.role === "staff" || profile.role === "admin");

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("requisition.title")}
        subtitle={t("requisition.subtitle")}
        actions={<Button onClick={() => setShowForm(true)}><Plus size={14} className="mr-1" />{t("requisition.new")}</Button>}
      />

      {requisitions.length === 0 ? (
        <EmptyState
          title={t("requisition.none")}
          description={t("ui.noData")}
          action={<Button onClick={() => setShowForm(true)}>{t("requisition.new")}</Button>}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("requisition.reqNumber")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("requisition.department")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("requisition.items")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.date")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map(req => (
                <tr key={req.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{req.req_number}</td>
                  <td className="px-4 py-3">{req.department}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(req.items || []).map((it, idx) => (
                        <Badge key={idx} variant="outline">
                          {it.item?.name || it.item_id} × {it.quantity}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(req.status) as "warning" | "info" | "success" | "destructive"}>{req.status}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(req.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">
                    {canApprove && req.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(req.id, "approve")} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">{t("requisition.approve")}</button>
                        <button onClick={() => handleAction(req.id, "reject")} className="rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">{t("requisition.reject")}</button>
                      </div>
                    )}
                    {canApprove && req.status === "approved" && (
                      <button onClick={() => handleAction(req.id, "issue")} className="rounded-lg bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90">{t("requisition.issue")}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showForm}
        onOpenChange={setShowForm}
        title={t("requisition.new")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={(e) => handleSubmit(e as unknown as React.FormEvent)} disabled={submitting}>
              {submitting ? t("common.saving") : t("common.submit")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1">{t("requisition.department")}</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">{t("requisition.items")}</label>
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  value={line.item_id}
                  onChange={(e) => updateLine(i, "item_id", e.target.value)}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">{t("pharmacy.selectItem")}</option>
                  {inventory.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.quantity})</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(i, "quantity", Number(e.target.value))}
                  className="w-20 rounded-lg border border-input bg-background px-2 py-2 text-sm"
                />
                <button type="button" onClick={() => removeLine(i)} className="text-destructive p-1"><Trash2 size={14} /></button>
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-xs text-primary hover:underline">+ {t("requisition.addItem")}</button>
          </div>

          <Input label={t("requisition.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </form>
      </Modal>
    </PageContainer>
  );
}
