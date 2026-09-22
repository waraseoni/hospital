"use client";

import { useEffect, useState } from "react";
import type { BloodUnit, BloodDonation, BloodRequest, Patient } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, Droplets, HeartHandshake, ClipboardList } from "lucide-react";

type Tab = "inventory" | "donations" | "requests";
const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = ["whole", "prbc", "ffp", "platelets", "cryo", "plasma"];

export default function AdminBloodBankPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("inventory");
  const [units, setUnits] = useState<BloodUnit[]>([]);
  const [donations, setDonations] = useState<BloodDonation[]>([]);
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDon, setShowDon] = useState(false);
  const [donForm, setDonForm] = useState({ donor_name: "", donor_phone: "", donor_age: "", blood_group: "O+", screened: true, screening_notes: "" });
  const [showUnit, setShowUnit] = useState(false);
  const [unitForm, setUnitForm] = useState({ blood_group: "O+", component: "whole", volume_ml: 350, expiry_date: "" });
  const [showReq, setShowReq] = useState(false);
  const [reqForm, setReqForm] = useState({ patient_name: "", patient_id: "", blood_group: "O+", component: "whole", quantity: 1, urgency: "routine", department: "", notes: "" });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [issueReq, setIssueReq] = useState<BloodRequest | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [un, dn, rq, pt] = await Promise.all([
      fetch("/api/blood-bank?kind=inventory").then(r => r.json()).catch(() => ({ units: [] })),
      fetch("/api/blood-bank?kind=donations").then(r => r.json()).catch(() => ({ donations: [] })),
      fetch("/api/blood-bank?kind=requests").then(r => r.json()).catch(() => ({ requests: [] })),
      fetch("/api/billing").then(() => null).catch(() => null),
    ]);
    setUnits(un.units || []);
    setDonations(dn.donations || []);
    setRequests(rq.requests || []);
    const supabase = (await import("@/lib/supabase/client")).createClient();
    const { data: pats } = await supabase.from("patients").select("*").order("name").limit(200);
    setPatients((pats as Patient[]) || []);
    setLoading(false);
  }

  async function createDonation(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/blood-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "donation", ...donForm, donor_age: donForm.donor_age ? Number(donForm.donor_age) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("blood.donationSaved"));
      setShowDon(false);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function createUnit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/blood-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "unit", ...unitForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("blood.unitAdded"));
      setShowUnit(false);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function createRequest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/blood-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "request", ...reqForm, quantity: Number(reqForm.quantity), patient_id: reqForm.patient_id || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("blood.requestCreated"));
      setShowReq(false);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function requestAction(id: string, action: string, extra: Record<string, unknown> = {}) {
    try {
      const res = await fetch("/api/blood-bank", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "request", id, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("blood.updated"));
      setIssueReq(null);
      setSelectedUnits([]);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  async function unitAction(id: string, action: string) {
    await fetch("/api/blood-bank", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "unit", id, action }),
    });
    load();
  }

  function daysToExpiry(d: string) {
    return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  }

  const statusVariant = (s: string) =>
    s === "available" ? "success" : s === "issued" ? "info" : s === "expired" || s === "discarded" ? "destructive" : "warning";

  const matched = units.filter(u =>
    u.status === "available" &&
    u.blood_group === issueReq?.blood_group &&
    daysToExpiry(u.expiry_date) > 0
  );

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("blood.title")}
        subtitle={t("blood.subtitle")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDon(true)}><HeartHandshake size={14} className="mr-1" />{t("blood.newDonation")}</Button>
            <Button variant="outline" onClick={() => setShowUnit(true)}><Droplets size={14} className="mr-1" />{t("blood.addUnit")}</Button>
            <Button onClick={() => setShowReq(true)}><ClipboardList size={14} className="mr-1" />{t("blood.newRequest")}</Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="rounded-xl border border-border bg-card p-3 text-sm">
          <p className="text-muted-foreground text-xs">{t("blood.available")}</p>
          <p className="text-2xl font-bold text-green-600">{units.filter(u => u.status === "available").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-sm">
          <p className="text-muted-foreground text-xs">{t("blood.reserved")}</p>
          <p className="text-2xl font-bold text-amber-600">{units.filter(u => u.status === "reserved").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-sm">
          <p className="text-muted-foreground text-xs">{t("blood.pendingReq")}</p>
          <p className="text-2xl font-bold text-sky-600">{requests.filter(r => r.status === "pending").length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-sm">
          <p className="text-muted-foreground text-xs">{t("blood.totalDonations")}</p>
          <p className="text-2xl font-bold text-red-600">{donations.length}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {([["inventory", t("blood.inventory")], ["donations", t("blood.donations")], ["requests", t("blood.requests")]] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "inventory" && (
        units.length === 0 ? (
          <EmptyState title={t("blood.noUnits")} description={t("ui.noData")} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("blood.unitCode")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("blood.group")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("blood.component")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("inventory.expiryDate")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {units.map(u => {
                  const d = daysToExpiry(u.expiry_date);
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{u.unit_code}</td>
                      <td className="px-4 py-3"><Badge variant={u.blood_group.includes("O") ? "destructive" : "info"}>{u.blood_group}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{u.component}</td>
                      <td className="px-4 py-3 text-xs">
                        {u.expiry_date}
                        {u.status === "available" && d <= 3 && d > 0 && <Badge variant="warning" className="ml-1">{d}d</Badge>}
                        {u.status === "available" && d <= 0 && <Badge variant="destructive" className="ml-1">{t("inventory.expired")}</Badge>}
                      </td>
                      <td className="px-4 py-3"><Badge variant={statusVariant(u.status) as "success" | "info" | "destructive" | "warning"}>{u.status}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {u.status === "available" && (
                            <button onClick={() => unitAction(u.id, "discard")} className="rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">{t("blood.discard")}</button>
                          )}
                          {u.status === "reserved" && (
                            <button onClick={() => unitAction(u.id, "issue")} className="rounded-lg bg-primary px-2 py-1 text-xs text-primary-foreground">{t("blood.issue")}</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "donations" && (
        donations.length === 0 ? (
          <EmptyState title={t("blood.noDonations")} description={t("ui.noData")} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("blood.group")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("blood.volume")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.date")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("blood.screened")}</th>
                </tr>
              </thead>
              <tbody>
                {donations.map(d => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{d.donor_name}<div className="text-xs text-muted-foreground">{d.donor_phone}</div></td>
                    <td className="px-4 py-3"><Badge variant="destructive">{d.blood_group}</Badge></td>
                    <td className="px-4 py-3">{d.volume_ml} ml</td>
                    <td className="px-4 py-3 text-xs">{new Date(d.collected_at).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3"><Badge variant={d.screened ? "success" : "warning"}>{d.screened ? "Yes" : "No"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "requests" && (
        requests.length === 0 ? (
          <EmptyState title={t("blood.noRequests")} description={t("ui.noData")} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("blood.reqNo")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("nav.patients")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("blood.group")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("inventory.qty")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("blood.urgency")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{r.request_number}</td>
                    <td className="px-4 py-3">{r.patient?.name || r.patient_name || "—"}</td>
                    <td className="px-4 py-3"><Badge variant="destructive">{r.blood_group}</Badge> <span className="text-xs text-muted-foreground">{r.component}</span></td>
                    <td className="px-4 py-3">{r.quantity}</td>
                    <td className="px-4 py-3"><Badge variant={r.urgency === "emergency" ? "destructive" : r.urgency === "urgent" ? "warning" : "outline"}>{r.urgency}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(r.status) as "success" | "info" | "destructive" | "warning"}>{r.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.status === "pending" && (
                          <>
                            <button onClick={() => requestAction(r.id, "approve")} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">{t("blood.approve")}</button>
                            <button onClick={() => requestAction(r.id, "reject")} className="rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive">{t("blood.reject")}</button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <button onClick={() => { setIssueReq(r); setSelectedUnits([]); }} className="rounded-lg bg-primary px-2 py-1 text-xs text-primary-foreground">{t("blood.issue")}</button>
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

      <Modal open={showDon} onOpenChange={setShowDon} title={t("blood.newDonation")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowDon(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => createDonation(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={createDonation} className="space-y-3">
          <Input label={t("common.name")} value={donForm.donor_name} onChange={(e) => setDonForm({ ...donForm, donor_name: e.target.value })} required />
          <Input label={t("common.phone")} value={donForm.donor_phone} onChange={(e) => setDonForm({ ...donForm, donor_phone: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" label={t("blood.age")} value={donForm.donor_age} onChange={(e) => setDonForm({ ...donForm, donor_age: e.target.value })} />
            <div>
              <label className="text-xs font-medium block mb-1">{t("blood.group")}</label>
              <select value={donForm.blood_group} onChange={(e) => setDonForm({ ...donForm, blood_group: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={donForm.screened} onChange={(e) => setDonForm({ ...donForm, screened: e.target.checked })} />
            {t("blood.screened")} ({t("blood.createsUnit")})
          </label>
        </form>
      </Modal>

      <Modal open={showUnit} onOpenChange={setShowUnit} title={t("blood.addUnit")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowUnit(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => createUnit(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={createUnit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1">{t("blood.group")}</label>
              <select value={unitForm.blood_group} onChange={(e) => setUnitForm({ ...unitForm, blood_group: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t("blood.component")}</label>
              <select value={unitForm.component} onChange={(e) => setUnitForm({ ...unitForm, component: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <Input type="number" label={t("blood.volume")} value={unitForm.volume_ml} onChange={(e) => setUnitForm({ ...unitForm, volume_ml: Number(e.target.value) })} />
          <Input type="date" label={t("inventory.expiryDate")} value={unitForm.expiry_date} onChange={(e) => setUnitForm({ ...unitForm, expiry_date: e.target.value })} required />
        </form>
      </Modal>

      <Modal open={showReq} onOpenChange={setShowReq} title={t("blood.newRequest")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowReq(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => createRequest(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.submit")}</Button>
        </>
      }>
        <form onSubmit={createRequest} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t("nav.patients")}</label>
            <select value={reqForm.patient_id} onChange={(e) => {
              const p = patients.find(x => x.id === e.target.value);
              setReqForm({ ...reqForm, patient_id: e.target.value, patient_name: p?.name || "", blood_group: p?.blood_group || reqForm.blood_group });
            }} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>)}
            </select>
          </div>
          <Input label={t("common.name")} value={reqForm.patient_name} onChange={(e) => setReqForm({ ...reqForm, patient_name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1">{t("blood.group")}</label>
              <select value={reqForm.blood_group} onChange={(e) => setReqForm({ ...reqForm, blood_group: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t("blood.component")}</label>
              <select value={reqForm.component} onChange={(e) => setReqForm({ ...reqForm, component: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {COMPONENTS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={1} label={t("inventory.qty")} value={reqForm.quantity} onChange={(e) => setReqForm({ ...reqForm, quantity: Number(e.target.value) })} />
            <div>
              <label className="text-xs font-medium block mb-1">{t("blood.urgency")}</label>
              <select value={reqForm.urgency} onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {["routine", "urgent", "emergency"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <Input label={t("requisition.department")} value={reqForm.department} onChange={(e) => setReqForm({ ...reqForm, department: e.target.value })} />
        </form>
      </Modal>

      <Modal
        open={!!issueReq}
        onOpenChange={() => { setIssueReq(null); setSelectedUnits([]); }}
        title={t("blood.issueUnits")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setIssueReq(null); setSelectedUnits([]); }}>{t("common.cancel")}</Button>
            <Button
              disabled={selectedUnits.length === 0}
              onClick={() => issueReq && requestAction(issueReq.id, "issue", { unit_ids: selectedUnits, crossmatch: "compatible" })}
            >
              {t("blood.issue")} ({selectedUnits.length})
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {issueReq?.request_number} — {issueReq?.blood_group} × {issueReq?.quantity}
          </p>
          {matched.length === 0 ? (
            <p className="text-sm text-destructive">{t("blood.noMatch")}</p>
          ) : (
            matched.map(u => (
              <label key={u.id} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm cursor-pointer hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={selectedUnits.includes(u.id)}
                  onChange={(e) => setSelectedUnits(prev => e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id))}
                />
                <span className="font-mono text-xs flex-1">{u.unit_code}</span>
                <Badge variant="info">{u.component}</Badge>
                <span className="text-xs text-muted-foreground">{u.expiry_date}</span>
                <span className="text-xs text-muted-foreground">{u.volume_ml}ml</span>
              </label>
            ))
          )}
          <p className="text-xs text-muted-foreground">{t("blood.crossmatchNote")}</p>
        </div>
      </Modal>
    </PageContainer>
  );
}
