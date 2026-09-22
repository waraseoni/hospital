"use client";

import { useEffect, useState } from "react";
import type { Claim, Invoice, InsurancePanel } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, ChevronRight } from "lucide-react";

const STAGES: Claim["stage"][] = ["intimation", "preauth", "claim", "settled", "rejected"];

export default function StaffClaimsPage() {
  const { t } = useI18n();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [panels, setPanels] = useState<InsurancePanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoice_id: "", panel_id: "", insurer_code: "", policy_no: "", amount: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [advanceClaim, setAdvanceClaim] = useState<Claim | null>(null);
  const [nextStage, setNextStage] = useState<Claim["stage"]>("preauth");
  const [nextStatus, setNextStatus] = useState<Claim["status"]>("submitted");
  const [approvalNo, setApprovalNo] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    const [claimRes, invRes, pkgRes] = await Promise.all([
      fetch("/api/claims").then(r => r.json()).catch(() => ({ claims: [] })),
      fetch("/api/billing").then(r => r.json()).catch(() => ({ invoices: [] })),
      fetch("/api/packages").then(r => r.json()).catch(() => ({ panels: [] })),
    ]);
    setClaims(claimRes.claims || []);
    setInvoices((invRes.invoices || []).filter((i: Invoice & { patient?: unknown }) => {
      const c = (claimRes.claims || []).some((cl: Claim) => cl.invoice_id === i.id);
      return !c;
    }));
    setPanels(pkgRes.panels || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: form.invoice_id,
          panel_id: form.panel_id || null,
          insurer_code: form.insurer_code,
          policy_no: form.policy_no,
          amount: form.amount ? Number(form.amount) : undefined,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("claims.createFailed"));
      addToast("success", t("claims.createSuccess"));
      setShowForm(false);
      setForm({ invoice_id: "", panel_id: "", insurer_code: "", policy_no: "", amount: "", notes: "" });
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdvance(e: React.FormEvent) {
    e.preventDefault();
    if (!advanceClaim) return;
    setAdvancing(true);
    try {
      const res = await fetch(`/api/claims/${advanceClaim.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: nextStage,
          status: nextStatus,
          approval_no: approvalNo || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("claims.updateFailed"));
      addToast("success", t("claims.updateSuccess"));
      setAdvanceClaim(null);
      setApprovalNo("");
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setAdvancing(false);
    }
  }

  function openAdvance(claim: Claim) {
    setAdvanceClaim(claim);
    const idx = STAGES.indexOf(claim.stage);
    setNextStage(STAGES[Math.min(idx + 1, STAGES.length - 1)]);
    setNextStatus(
      claim.status === "draft" ? "submitted" :
      claim.status === "submitted" ? "approved" :
      claim.status === "approved" ? "paid" : claim.status
    );
    setApprovalNo(claim.approval_no || "");
  }

  const statusVariant = (s: string) =>
    s === "paid" || s === "approved" ? "success" : s === "rejected" ? "destructive" : s === "submitted" ? "info" : "warning";

  const stageVariant = (s: string) =>
    s === "settled" ? "success" : s === "rejected" ? "destructive" : "info";

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("claims.title")}
        subtitle={t("claims.subtitle")}
        actions={<Button onClick={() => setShowForm(true)}><Plus size={14} className="mr-1" />{t("claims.new")}</Button>}
      />

      {claims.length === 0 ? (
        <EmptyState title={t("claims.none")} description={t("ui.noData")} action={<Button onClick={() => setShowForm(true)}>{t("claims.new")}</Button>} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("claims.claimNo")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("billing.invoiceNo")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("claims.insurer")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("claims.amount")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("claims.stage")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {claims.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{c.claim_number}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-mono">{(c.invoice as unknown as Invoice)?.invoice_number || c.invoice_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {(c.invoice as unknown as { patient?: { name?: string } })?.patient?.name || ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.panel?.name || c.insurer_code}</div>
                    <div className="text-xs text-muted-foreground font-mono">{c.policy_no || "—"}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">₹{c.amount}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs">
                      {STAGES.filter(s => s !== "rejected" && s !== "settled").map((s, i) => (
                        <span key={s} className="flex items-center">
                          {i > 0 && <ChevronRight size={10} className="text-muted-foreground" />}
                          <span className={`px-1.5 py-0.5 rounded ${c.stage === s ? "bg-primary text-primary-foreground font-semibold" : STAGES.indexOf(c.stage) > STAGES.indexOf(s) ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {t(`claims.stage_${s}` as "claims.stage_intimation")}
                          </span>
                        </span>
                      ))}
                      {(c.stage === "settled" || c.stage === "rejected") && (
                        <Badge variant={stageVariant(c.stage) as "success" | "destructive"} className="ml-1">{c.stage}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(c.status) as "success" | "destructive" | "info" | "warning"}>{c.status}</Badge></td>
                  <td className="px-4 py-3">
                    {c.stage !== "settled" && c.stage !== "rejected" && (
                      <Button size="sm" variant="outline" onClick={() => openAdvance(c)}>{t("claims.advance")}</Button>
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
        title={t("claims.new")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={(e) => handleCreate(e as unknown as React.FormEvent)} disabled={submitting}>
              {submitting ? t("common.saving") : t("common.submit")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t("billing.invoiceNo")} *</label>
            <select value={form.invoice_id} onChange={(e) => setForm({ ...form, invoice_id: e.target.value })} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {invoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} — ₹{inv.net_amount}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t("billing.panel")}</label>
            <select value={form.panel_id} onChange={(e) => {
              const p = panels.find(x => x.id === e.target.value);
              setForm({ ...form, panel_id: e.target.value, insurer_code: p ? p.code : form.insurer_code });
            }} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {panels.map(p => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
            </select>
          </div>
          <Input label={t("claims.insurer")} value={form.insurer_code} onChange={(e) => setForm({ ...form, insurer_code: e.target.value })} required />
          <Input label={t("claims.policyNo")} value={form.policy_no} onChange={(e) => setForm({ ...form, policy_no: e.target.value })} />
          <Input label={t("claims.amount")} type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder={t("claims.amountOptional")} />
        </form>
      </Modal>

      <Modal
        open={!!advanceClaim}
        onOpenChange={() => setAdvanceClaim(null)}
        title={t("claims.advanceTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdvanceClaim(null)}>{t("common.cancel")}</Button>
            <Button onClick={(e) => handleAdvance(e as unknown as React.FormEvent)} disabled={advancing}>
              {advancing ? t("common.saving") : t("claims.advance")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdvance} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t("claims.stage")}</label>
            <select value={nextStage} onChange={(e) => setNextStage(e.target.value as Claim["stage"])} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t("common.status")}</label>
            <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as Claim["status"])} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {(["draft", "submitted", "approved", "paid", "rejected"] as const).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label={t("claims.approvalNo")} value={approvalNo} onChange={(e) => setApprovalNo(e.target.value)} />
        </form>
      </Modal>
    </PageContainer>
  );
}
