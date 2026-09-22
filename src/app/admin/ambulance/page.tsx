"use client";

import { useEffect, useState } from "react";
import type { Ambulance, AmbulanceCall } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, Phone, Truck, Play, CheckCircle2 } from "lucide-react";

type Tab = "fleet" | "calls";

export default function AdminAmbulancePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("calls");
  const [fleet, setFleet] = useState<Ambulance[]>([]);
  const [calls, setCalls] = useState<(AmbulanceCall & { ambulance?: Ambulance })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVeh, setShowVeh] = useState(false);
  const [vehForm, setVehForm] = useState({ vehicle_no: "", ambulance_type: "BLS", driver_name: "", driver_phone: "", base_location: "" });
  const [showCall, setShowCall] = useState(false);
  const [callForm, setCallForm] = useState({ patient_name: "", patient_phone: "", pickup_address: "", drop_address: "", condition_notes: "", trip_type: "emergency" });
  const [assignCall, setAssignCall] = useState<AmbulanceCall | null>(null);
  const [assignAmb, setAssignAmb] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [fl, cl] = await Promise.all([
      fetch("/api/ambulance?kind=ambulances").then(r => r.json()).catch(() => ({ ambulances: [] })),
      fetch("/api/ambulance?kind=calls").then(r => r.json()).catch(() => ({ calls: [] })),
    ]);
    setFleet(fl.ambulances || []);
    setCalls(cl.calls || []);
    setLoading(false);
  }

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/ambulance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "vehicle", ...vehForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("ambulance.vehicleAdded"));
      setShowVeh(false);
      setVehForm({ vehicle_no: "", ambulance_type: "BLS", driver_name: "", driver_phone: "", base_location: "" });
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function createCall(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/ambulance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "call", ...callForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("ambulance.callCreated"));
      setShowCall(false);
      setCallForm({ patient_name: "", patient_phone: "", pickup_address: "", drop_address: "", condition_notes: "", trip_type: "emergency" });
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function callAction(id: string, action: string, extra: Record<string, unknown> = {}) {
    try {
      const res = await fetch("/api/ambulance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "call", id, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("ambulance.updated"));
      setAssignCall(null);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  async function setVehStatus(id: string, status: string) {
    await fetch("/api/ambulance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "vehicle", id, action: status }),
    });
    load();
  }

  const statusVariant = (s: string) =>
    s === "available" || s === "completed" ? "success" : s === "on_trip" || s === "en_route" ? "warning" : s === "cancelled" ? "muted" : "info";

  const available = fleet.filter(f => f.status === "available" && f.is_active);

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("ambulance.title")}
        subtitle={t("ambulance.subtitle")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowVeh(true)}><Truck size={14} className="mr-1" />{t("ambulance.addVehicle")}</Button>
            <Button onClick={() => setShowCall(true)}><Phone size={14} className="mr-1" />{t("ambulance.newCall")}</Button>
          </div>
        }
      />

      <div className="flex gap-2 mb-5">
        {([["calls", t("ambulance.calls")], ["fleet", t("ambulance.fleet")]] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "fleet" && (
        fleet.length === 0 ? (
          <EmptyState title={t("ambulance.noFleet")} description={t("ui.noData")} action={<Button onClick={() => setShowVeh(true)}>{t("ambulance.addVehicle")}</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fleet.map(a => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold">{a.vehicle_no}</span>
                  <Badge variant={statusVariant(a.status) as "success" | "warning" | "muted" | "info"}>{a.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{a.ambulance_type} · {a.driver_name || "—"}</p>
                <p className="text-xs text-muted-foreground">{a.driver_phone} {a.base_location && `· ${a.base_location}`}</p>
                <div className="flex gap-2 pt-1">
                  {a.status === "available" && (
                    <Button size="sm" variant="outline" onClick={() => setVehStatus(a.id, "on_trip")}>{t("ambulance.setOnTrip")}</Button>
                  )}
                  {a.status === "on_trip" && (
                    <Button size="sm" onClick={() => setVehStatus(a.id, "available")}>{t("ambulance.setAvailable")}</Button>
                  )}
                  {a.status === "maintenance" && (
                    <Button size="sm" variant="outline" onClick={() => setVehStatus(a.id, "available")}>{t("ambulance.setAvailable")}</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "calls" && (
        calls.length === 0 ? (
          <EmptyState title={t("ambulance.noCalls")} description={t("ui.noData")} action={<Button onClick={() => setShowCall(true)}>{t("ambulance.newCall")}</Button>} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("ambulance.callNo")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("nav.patients")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("ambulance.pickup")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("ambulance.vehicle")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {calls.map(c => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{c.call_number}<div className="text-xs text-muted-foreground">{c.trip_type}</div></td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.patient_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.patient_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{c.pickup_address}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.ambulance?.vehicle_no || "—"}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(c.status) as "success" | "warning" | "muted" | "info"}>{c.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {c.status === "received" && (
                          <Button size="sm" variant="outline" onClick={() => setAssignCall(c)}>{t("ambulance.assign")}</Button>
                        )}
                        {c.status === "assigned" && (
                          <Button size="sm" variant="outline" onClick={() => callAction(c.id, "start")}><Play size={12} className="mr-1" />{t("ambulance.start")}</Button>
                        )}
                        {c.status === "en_route" && (
                          <Button size="sm" variant="outline" onClick={() => callAction(c.id, "arrive")}>{t("ambulance.arrive")}</Button>
                        )}
                        {c.status === "arrived" && (
                          <Button size="sm" onClick={() => callAction(c.id, "complete")}><CheckCircle2 size={12} className="mr-1" />{t("ambulance.complete")}</Button>
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

      <Modal open={showVeh} onOpenChange={setShowVeh} title={t("ambulance.addVehicle")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowVeh(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => createVehicle(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={createVehicle} className="space-y-3">
          <Input label={t("ambulance.vehicleNo")} value={vehForm.vehicle_no} onChange={(e) => setVehForm({ ...vehForm, vehicle_no: e.target.value })} required />
          <div>
            <label className="text-xs font-medium block mb-1">{t("ambulance.type")}</label>
            <select value={vehForm.ambulance_type} onChange={(e) => setVehForm({ ...vehForm, ambulance_type: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {["BLS", "ALS", "patient_transport", "neonatal"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <Input label={t("ambulance.driver")} value={vehForm.driver_name} onChange={(e) => setVehForm({ ...vehForm, driver_name: e.target.value })} />
          <Input label={t("common.phone")} value={vehForm.driver_phone} onChange={(e) => setVehForm({ ...vehForm, driver_phone: e.target.value })} />
          <Input label={t("ambulance.base")} value={vehForm.base_location} onChange={(e) => setVehForm({ ...vehForm, base_location: e.target.value })} />
        </form>
      </Modal>

      <Modal open={showCall} onOpenChange={setShowCall} title={t("ambulance.newCall")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowCall(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => createCall(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.submit")}</Button>
        </>
      }>
        <form onSubmit={createCall} className="space-y-3">
          <Input label={t("common.name")} value={callForm.patient_name} onChange={(e) => setCallForm({ ...callForm, patient_name: e.target.value })} />
          <Input label={t("common.phone")} value={callForm.patient_phone} onChange={(e) => setCallForm({ ...callForm, patient_phone: e.target.value })} />
          <Input label={t("ambulance.pickup")} value={callForm.pickup_address} onChange={(e) => setCallForm({ ...callForm, pickup_address: e.target.value })} required />
          <Input label={t("ambulance.drop")} value={callForm.drop_address} onChange={(e) => setCallForm({ ...callForm, drop_address: e.target.value })} />
          <div>
            <label className="text-xs font-medium block mb-1">{t("ambulance.tripType")}</label>
            <select value={callForm.trip_type} onChange={(e) => setCallForm({ ...callForm, trip_type: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {["emergency", "transfer", "discharge", "routine"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <Input label={t("ambulance.condition")} value={callForm.condition_notes} onChange={(e) => setCallForm({ ...callForm, condition_notes: e.target.value })} />
        </form>
      </Modal>

      <Modal open={!!assignCall} onOpenChange={() => setAssignCall(null)} title={t("ambulance.assign")} footer={
        <>
          <Button variant="ghost" onClick={() => setAssignCall(null)}>{t("common.cancel")}</Button>
          <Button disabled={!assignAmb} onClick={() => assignCall && callAction(assignCall.id, "assign", { ambulance_id: assignAmb })}>{t("common.save")}</Button>
        </>
      }>
        <div>
          <label className="text-xs font-medium block mb-1">{t("ambulance.vehicle")}</label>
          <select value={assignAmb} onChange={(e) => setAssignAmb(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">—</option>
            {available.map(a => <option key={a.id} value={a.id}>{a.vehicle_no} ({a.driver_name})</option>)}
          </select>
          {available.length === 0 && <p className="text-xs text-destructive mt-1">{t("ambulance.noAvailable")}</p>}
        </div>
      </Modal>
    </PageContainer>
  );
}
