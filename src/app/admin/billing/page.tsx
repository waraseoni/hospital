"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Invoice, Payment, ServicePackage, InsurancePanel, Patient } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { UpiQrModal } from "@/components/ui/upi-qr";
import { Download, Printer, QrCode, CreditCard, FileText, Plus, Package } from "lucide-react";

type Tab = "invoices" | "packages" | "panels";

export default function AdminBillingPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("invoices");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [panels, setPanels] = useState<InsurancePanel[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [paying, setPaying] = useState(false);
  const [qrInvoice, setQrInvoice] = useState<Invoice | null>(null);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [pkgForm, setPkgForm] = useState({ code: "", name: "", description: "", base_amount: 0, discount_percent: 0, panel_id: "" });
  const [showPanelForm, setShowPanelForm] = useState(false);
  const [panelForm, setPanelForm] = useState({ code: "", name: "", contact: "" });
  const [showCreateInv, setShowCreateInv] = useState(false);
  const [createPatientId, setCreatePatientId] = useState("");
  const [createPkgId, setCreatePkgId] = useState("");
  const [createTax, setCreateTax] = useState("0");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const supabase = createClient();
    const [invRes, pkgRes, patRes] = await Promise.all([
      fetch("/api/billing").then(r => r.json()).catch(() => ({ invoices: [] })),
      fetch("/api/packages").then(r => r.json()).catch(() => ({ packages: [], panels: [] })),
      supabase.from("patients").select("*").order("name").limit(300),
    ]);
    setInvoices(invRes.invoices || []);
    setPackages(pkgRes.packages || []);
    setPanels(pkgRes.panels || []);
    setPatients((patRes.data as Patient[]) || []);
    setLoading(false);
  }

  const filtered = invoices.filter(inv => {
    const q = filter.toLowerCase();
    const matchQ = !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.patient as unknown as Patient)?.name?.toLowerCase().includes(q) ||
      (inv.patient as unknown as Patient)?.uhid?.toLowerCase().includes(q);
    const matchS = !statusFilter || inv.payment_status === statusFilter;
    return matchQ && matchS;
  });

  async function downloadPdf(inv: Invoice, kind: "invoice" | "receipt" = "invoice") {
    try {
      const res = await fetch("/api/billing/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: inv.id, kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("billing.pdfFailed"));
      window.open(data.pdf_url, "_blank");
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  async function printInvoice(inv: Invoice) {
    try {
      const res = await fetch("/api/billing/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: inv.id, kind: inv.payment_status === "paid" ? "receipt" : "invoice" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("billing.pdfFailed"));
      const printWindow = window.open(data.pdf_url, "_blank");
      if (printWindow) {
        printWindow.addEventListener("load", () => printWindow.print());
      }
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payInvoice) return;
    setPaying(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: payInvoice.id,
          amount: parseFloat(payAmount) || payInvoice.net_amount,
          method: payMethod,
          reference: payRef,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("billing.paymentFailed"));
      addToast("success", t("billing.paymentSuccess"));
      setPayInvoice(null);
      setPayAmount("");
      setPayRef("");
      loadAll();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setPaying(false);
    }
  }

  function openPay(inv: Invoice) {
    setPayInvoice(inv);
    setPayAmount(String(inv.net_amount));
    setPayMethod("cash");
    setPayRef("");
  }

  async function handlePkg(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "package", ...pkgForm, panel_id: pkgForm.panel_id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("billing.saveFailed"));
      addToast("success", t("billing.pkgCreated"));
      setShowPkgForm(false);
      setPkgForm({ code: "", name: "", description: "", base_amount: 0, discount_percent: 0, panel_id: "" });
      loadAll();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePanel(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "panel", ...panelForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("billing.saveFailed"));
      addToast("success", t("billing.panelCreated"));
      setShowPanelForm(false);
      setPanelForm({ code: "", name: "", contact: "" });
      loadAll();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: createPatientId,
          package_id: createPkgId || null,
          tax: parseFloat(createTax) || 0,
          payment_status: "pending",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("billing.createFailed"));
      addToast("success", t("billing.createSuccess"));
      setShowCreateInv(false);
      setCreatePatientId("");
      setCreatePkgId("");
      loadAll();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const statusVariant = (s: string) =>
    s === "paid" ? "success" : s === "partial" ? "info" : s === "pending" ? "warning" : "muted";

  const tabs: { id: Tab; label: string }[] = [
    { id: "invoices", label: t("billing.title") },
    { id: "packages", label: t("billing.packages") },
    { id: "panels", label: t("billing.panels") },
  ];

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("billing.adminTitle")}
        subtitle={t("billing.adminSubtitle")}
        actions={<Button onClick={() => setShowCreateInv(true)}><Plus size={14} className="mr-1" />{t("billing.newInvoice")}</Button>}
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

      {tab === "invoices" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <Input placeholder={t("billing.search")} value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              <option value="">{t("common.status")}</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title={t("billing.noInvoices")} description={t("ui.noData")} />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("billing.invoiceNo")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("nav.patients")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("billing.amount")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.date")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => {
                    const pat = inv.patient as unknown as Patient;
                    return (
                      <tr key={inv.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{pat?.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{pat?.uhid}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">₹{inv.net_amount}</td>
                        <td className="px-4 py-3"><Badge variant={statusVariant(inv.payment_status) as "success" | "info" | "warning" | "muted"}>{inv.payment_status}</Badge></td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(inv.created_at).toLocaleDateString("en-IN")}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => downloadPdf(inv, "invoice")} title={t("billing.downloadPdf")}>
                              <Download size={12} />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => printInvoice(inv)} title={t("billing.print")}>
                              <Printer size={12} />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setQrInvoice(inv)} title={t("billing.upiQr")}>
                              <QrCode size={12} />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openPay(inv)} title={t("billing.recordPayment")}>
                              <CreditCard size={12} />
                            </Button>
                            {inv.payment_status === "paid" && (
                              <Button size="sm" variant="ghost" onClick={() => downloadPdf(inv, "receipt")} title={t("billing.receipt")}>
                                <FileText size={12} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "packages" && (
        <>
          <div className="mb-4">
            <Button onClick={() => setShowPkgForm(true)}><Plus size={14} className="mr-1" />{t("billing.addPackage")}</Button>
          </div>
          {packages.length === 0 ? (
            <EmptyState title={t("billing.noPackages")} description={t("ui.noData")} />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("billing.code")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("billing.baseAmount")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("billing.discountPct")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("billing.panel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map(pkg => (
                    <tr key={pkg.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{pkg.code}</td>
                      <td className="px-4 py-3 font-medium">{pkg.name}</td>
                      <td className="px-4 py-3">₹{pkg.base_amount}</td>
                      <td className="px-4 py-3">{pkg.discount_percent}%</td>
                      <td className="px-4 py-3 text-muted-foreground">{pkg.panel?.name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "panels" && (
        <>
          <div className="mb-4">
            <Button onClick={() => setShowPanelForm(true)}><Plus size={14} className="mr-1" />{t("billing.addPanel")}</Button>
          </div>
          {panels.length === 0 ? (
            <EmptyState title={t("billing.noPanels")} description={t("ui.noData")} />
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t("billing.code")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("billing.contact")}</th>
                    <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {panels.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.contact || "—"}</td>
                      <td className="px-4 py-3"><Badge variant={p.is_active ? "success" : "muted"}>{p.is_active ? "Active" : "Inactive"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <Modal
        open={!!payInvoice}
        onOpenChange={() => setPayInvoice(null)}
        title={t("billing.recordPayment")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayInvoice(null)}>{t("common.cancel")}</Button>
            <Button onClick={(e) => handlePayment(e as unknown as React.FormEvent)} disabled={paying}>
              {paying ? t("common.saving") : t("billing.confirmPayment")}
            </Button>
          </>
        }
      >
        <form onSubmit={handlePayment} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {payInvoice?.invoice_number} — ₹{payInvoice?.net_amount}
          </p>
          <Input type="number" min={0.01} step="0.01" label={t("billing.amount")} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
          <div>
            <label className="text-xs font-medium block mb-1">{t("billing.method")}</label>
            <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input label={t("billing.reference")} value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UTR / Txn ID" />
        </form>
      </Modal>

      <UpiQrModal
        open={!!qrInvoice}
        onOpenChange={() => setQrInvoice(null)}
        invoiceId={qrInvoice?.id}
        amount={qrInvoice?.net_amount || 0}
      />

      <Modal
        open={showPkgForm}
        onOpenChange={setShowPkgForm}
        title={t("billing.addPackage")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPkgForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={(e) => handlePkg(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
          </>
        }
      >
        <form onSubmit={handlePkg} className="space-y-3">
          <Input label={t("billing.code")} value={pkgForm.code} onChange={(e) => setPkgForm({ ...pkgForm, code: e.target.value })} required />
          <Input label={t("common.name")} value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} required />
          <Input label={t("billing.baseAmount")} type="number" min={0} value={pkgForm.base_amount} onChange={(e) => setPkgForm({ ...pkgForm, base_amount: Number(e.target.value) })} />
          <Input label={t("billing.discountPct")} type="number" min={0} max={100} value={pkgForm.discount_percent} onChange={(e) => setPkgForm({ ...pkgForm, discount_percent: Number(e.target.value) })} />
          <div>
            <label className="text-xs font-medium block mb-1">{t("billing.panel")}</label>
            <select value={pkgForm.panel_id} onChange={(e) => setPkgForm({ ...pkgForm, panel_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </form>
      </Modal>

      <Modal
        open={showPanelForm}
        onOpenChange={setShowPanelForm}
        title={t("billing.addPanel")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowPanelForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={(e) => handlePanel(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
          </>
        }
      >
        <form onSubmit={handlePanel} className="space-y-3">
          <Input label={t("billing.code")} value={panelForm.code} onChange={(e) => setPanelForm({ ...panelForm, code: e.target.value })} required />
          <Input label={t("common.name")} value={panelForm.name} onChange={(e) => setPanelForm({ ...panelForm, name: e.target.value })} required />
          <Input label={t("billing.contact")} value={panelForm.contact} onChange={(e) => setPanelForm({ ...panelForm, contact: e.target.value })} />
        </form>
      </Modal>

      <Modal
        open={showCreateInv}
        onOpenChange={setShowCreateInv}
        title={t("billing.newInvoice")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateInv(false)}>{t("common.cancel")}</Button>
            <Button onClick={(e) => handleCreateInvoice(e as unknown as React.FormEvent)} disabled={creating}>
              <Package size={14} className="mr-1" />
              {creating ? t("common.saving") : t("billing.createInvoice")}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateInvoice} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t("nav.patients")} *</label>
            <select value={createPatientId} onChange={(e) => setCreatePatientId(e.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t("billing.packages")}</label>
            <select value={createPkgId} onChange={(e) => setCreatePkgId(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">{t("billing.selectPackage")}</option>
              {packages.map(p => <option key={p.id} value={p.id}>{p.name} (−{p.discount_percent}%)</option>)}
            </select>
          </div>
          <Input label={`${t("billing.taxPct")}`} type="number" min={0} max={100} value={createTax} onChange={(e) => setCreateTax(e.target.value)} />
        </form>
      </Modal>
    </PageContainer>
  );
}
