"use client";

import { useEffect, useState } from "react";
import type { Attendance, Leave, Roster, Profile } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, Check, X, CalendarDays } from "lucide-react";

type Tab = "attendance" | "leaves" | "roster";
type StaffOpt = { id: string; full_name: string; role: string };

const ATT_STATUSES = ["present", "absent", "late", "half_day", "leave"] as const;
const SHIFTS = ["morning", "evening", "night", "general"] as const;
const LEAVE_TYPES = ["sick", "casual", "earned", "maternity", "unpaid", "other"] as const;

export default function AdminAttendancePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("attendance");
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showAtt, setShowAtt] = useState(false);
  const [attForm, setAttForm] = useState({ staff_id: "", status: "present" as Attendance["status"] });
  const [showLeave, setShowLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ staff_id: "", leave_type: "casual", from_date: date, to_date: date, reason: "" });
  const [showRoster, setShowRoster] = useState(false);
  const [rosterForm, setRosterForm] = useState({ staff_id: "", shift: "morning", department: "" });
  const [submitting, setSubmitting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { load(); }, [date, tab]);

  async function load() {
    setLoading(true);
    const [st, att, lv, ro] = await Promise.all([
      fetch("/api/staff-directory").then(r => r.json()).catch(() => ({ staff: [] })),
      fetch(`/api/attendance?date=${date}`).then(r => r.json()).catch(() => ({ attendance: [] })),
      fetch("/api/leaves").then(r => r.json()).catch(() => ({ leaves: [] })),
      fetch(`/api/rosters?date=${date}`).then(r => r.json()).catch(() => ({ rosters: [] })),
    ]);
    setStaff(st.staff || []);
    setAttendance(att.attendance || []);
    setLeaves(lv.leaves || []);
    setRosters(ro.rosters || []);
    setLoading(false);
  }

  async function markAtt(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...attForm, work_date: date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("attendance.marked"));
      setShowAtt(false);
      setAttForm({ staff_id: "", status: "present" });
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function createLeave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(leaveForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("attendance.leaveCreated"));
      setShowLeave(false);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function decideLeave(id: string, status: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      addToast("success", t("attendance.leaveUpdated"));
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  async function createRoster(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rosterForm, roster_date: date }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("attendance.rosterSaved"));
      setShowRoster(false);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const attVariant = (s: string) =>
    s === "present" ? "success" : s === "absent" ? "destructive" : s === "late" ? "warning" : "info";

  const tabs: { id: Tab; label: string }[] = [
    { id: "attendance", label: t("attendance.title") },
    { id: "leaves", label: t("attendance.leaves") },
    { id: "roster", label: t("attendance.roster") },
  ];

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("attendance.title")}
        subtitle={t("attendance.subtitle")}
        actions={
          <div className="flex gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 rounded-lg border border-input bg-background px-2 text-sm" />
            {tab === "attendance" && <Button onClick={() => setShowAtt(true)}><Plus size={14} className="mr-1" />{t("attendance.mark")}</Button>}
            {tab === "leaves" && <Button onClick={() => setShowLeave(true)}><Plus size={14} className="mr-1" />{t("attendance.newLeave")}</Button>}
            {tab === "roster" && <Button onClick={() => setShowRoster(true)}><Plus size={14} className="mr-1" />{t("attendance.newRoster")}</Button>}
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

      {tab === "attendance" && (
        attendance.length === 0 ? (
          <EmptyState title={t("attendance.none")} description={date} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.role")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">In</th>
                  <th className="px-4 py-3 text-left font-medium">Out</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map(a => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{a.staff?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.staff?.role}</td>
                    <td className="px-4 py-3"><Badge variant={attVariant(a.status) as "success" | "destructive" | "warning" | "info"}>{a.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.check_in ? new Date(a.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.check_out ? new Date(a.check_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "leaves" && (
        leaves.length === 0 ? (
          <EmptyState title={t("attendance.noLeaves")} description={t("ui.noData")} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("attendance.leaveType")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.date")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("attendance.reason")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{l.staff?.full_name || "—"}</td>
                    <td className="px-4 py-3">{l.leave_type}</td>
                    <td className="px-4 py-3 text-xs">{l.from_date} → {l.to_date}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{l.reason}</td>
                    <td className="px-4 py-3">
                      <Badge variant={l.status === "approved" ? "success" : l.status === "rejected" ? "destructive" : "warning"}>{l.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {l.status === "pending" && (
                        <div className="flex gap-2">
                          <button onClick={() => decideLeave(l.id, "approved")} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted flex items-center gap-1"><Check size={12} />{t("attendance.approve")}</button>
                          <button onClick={() => decideLeave(l.id, "rejected")} className="rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-1"><X size={12} />{t("attendance.reject")}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "roster" && (
        rosters.length === 0 ? (
          <EmptyState title={t("attendance.noRoster")} description={date} />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("attendance.shift")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("requisition.department")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("common.date")}</th>
                </tr>
              </thead>
              <tbody>
                {rosters.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{r.staff?.full_name || "—"}</td>
                    <td className="px-4 py-3"><Badge variant="info">{r.shift}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.department || "—"}</td>
                    <td className="px-4 py-3 text-xs">{r.roster_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal open={showAtt} onOpenChange={setShowAtt} title={t("attendance.mark")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowAtt(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => markAtt(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={markAtt} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t("nav.staff")}</label>
            <select value={attForm.staff_id} onChange={(e) => setAttForm({ ...attForm, staff_id: e.target.value })} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t("common.status")}</label>
            <select value={attForm.status} onChange={(e) => setAttForm({ ...attForm, status: e.target.value as Attendance["status"] })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {ATT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays size={12} />{date}</p>
        </form>
      </Modal>

      <Modal open={showLeave} onOpenChange={setShowLeave} title={t("attendance.newLeave")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowLeave(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => createLeave(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.submit")}</Button>
        </>
      }>
        <form onSubmit={createLeave} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t("nav.staff")}</label>
            <select value={leaveForm.staff_id} onChange={(e) => setLeaveForm({ ...leaveForm, staff_id: e.target.value })} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t("attendance.leaveType")}</label>
            <select value={leaveForm.leave_type} onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {LEAVE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" label="From" value={leaveForm.from_date} onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })} required />
            <Input type="date" label="To" value={leaveForm.to_date} onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })} required />
          </div>
          <Input label={t("attendance.reason")} value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
        </form>
      </Modal>

      <Modal open={showRoster} onOpenChange={setShowRoster} title={t("attendance.newRoster")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowRoster(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => createRoster(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={createRoster} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t("nav.staff")}</label>
            <select value={rosterForm.staff_id} onChange={(e) => setRosterForm({ ...rosterForm, staff_id: e.target.value })} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">{t("attendance.shift")}</label>
            <select value={rosterForm.shift} onChange={(e) => setRosterForm({ ...rosterForm, shift: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label={t("requisition.department")} value={rosterForm.department} onChange={(e) => setRosterForm({ ...rosterForm, department: e.target.value })} />
          <p className="text-xs text-muted-foreground">{date}</p>
        </form>
      </Modal>
    </PageContainer>
  );
}
