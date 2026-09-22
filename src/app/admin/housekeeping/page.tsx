"use client";

import { useEffect, useState } from "react";
import type { HousekeepingTask, Bed, Profile } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, Play, CheckCircle2, UserPlus } from "lucide-react";

type BedOpt = { id: string; ward_name: string; bed_number: string; is_ready: boolean };
type StaffOpt = { id: string; full_name: string; role: string };

export default function AdminHousekeepingPage() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [beds, setBeds] = useState<BedOpt[]>([]);
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bed_id: "", room_label: "", task_type: "regular", priority: "normal", notes: "" });
  const [assignTask, setAssignTask] = useState<HousekeepingTask | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [tk, bd, st] = await Promise.all([
      fetch("/api/housekeeping").then(r => r.json()).catch(() => ({ tasks: [] })),
      fetch("/api/beds/simple").then(r => r.json()).catch(() => ({ beds: [] })),
      fetch("/api/staff-directory").then(r => r.json()).catch(() => ({ staff: [] })),
    ]);
    setTasks(tk.tasks || []);
    setBeds(bd.beds || []);
    setStaff((st.staff || []).filter((s: StaffOpt) => ["staff", "nurse"].includes(s.role)));
    setLoading(false);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/housekeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("housekeeping.created"));
      setShowForm(false);
      setForm({ bed_id: "", room_label: "", task_type: "regular", priority: "normal", notes: "" });
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function action(id: string, act: string, extra: Record<string, unknown> = {}) {
    try {
      const res = await fetch("/api/housekeeping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: act, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      addToast("success", t("housekeeping.updated"));
      setAssignTask(null);
      load();
    } catch (err) {
      addToast("error", (err as Error).message);
    }
  }

  const filtered = tasks.filter(tk => !filter || tk.status === filter);
  const statusVariant = (s: string) =>
    s === "completed" ? "success" : s === "pending" ? "warning" : s === "in_progress" ? "info" : s === "cancelled" ? "muted" : "outline";

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("housekeeping.title")}
        subtitle={t("housekeeping.subtitle")}
        actions={<Button onClick={() => setShowForm(true)}><Plus size={14} className="mr-1" />{t("housekeeping.new")}</Button>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {["", "pending", "assigned", "in_progress", "completed"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === f ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"}`}
          >
            {f || t("common.status")}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t("housekeeping.none")} description={t("ui.noData")} action={<Button onClick={() => setShowForm(true)}>{t("housekeeping.new")}</Button>} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("housekeeping.room")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("housekeeping.type")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("housekeeping.priority")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("housekeeping.assigned")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tk => (
                <tr key={tk.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{tk.room_label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{tk.task_type}</td>
                  <td className="px-4 py-3">
                    <Badge variant={tk.priority === "urgent" || tk.priority === "high" ? "destructive" : "outline"}>{tk.priority}</Badge>
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(tk.status) as "success" | "warning" | "info" | "muted" | "outline"}>{tk.status}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{tk.assigned_to_profile?.full_name || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {tk.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => setAssignTask(tk)}><UserPlus size={12} className="mr-1" />{t("housekeeping.assign")}</Button>
                      )}
                      {tk.status === "assigned" && (
                        <Button size="sm" variant="outline" onClick={() => action(tk.id, "start")}><Play size={12} className="mr-1" />{t("housekeeping.start")}</Button>
                      )}
                      {(tk.status === "assigned" || tk.status === "in_progress") && (
                        <Button size="sm" onClick={() => action(tk.id, "complete")}><CheckCircle2 size={12} className="mr-1" />{t("housekeeping.complete")}</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showForm} onOpenChange={setShowForm} title={t("housekeeping.new")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => createTask(e as unknown as React.FormEvent)} disabled={submitting}>{submitting ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={createTask} className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">{t("nav.beds")}</label>
            <select value={form.bed_id} onChange={(e) => setForm({ ...form, bed_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {beds.map(b => <option key={b.id} value={b.id}>{b.ward_name} / {b.bed_number}</option>)}
            </select>
          </div>
          <Input label={t("housekeeping.room")} value={form.room_label} onChange={(e) => setForm({ ...form, room_label: e.target.value })} placeholder="Ward / Room" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium block mb-1">{t("housekeeping.type")}</label>
              <select value={form.task_type} onChange={(e) => setForm({ ...form, task_type: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {["regular", "deep", "discharge", "spill"].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">{t("housekeeping.priority")}</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                {["low", "normal", "high", "urgent"].map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>
          </div>
          <Input label={t("requisition.notes")} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>
      </Modal>

      <Modal open={!!assignTask} onOpenChange={() => setAssignTask(null)} title={t("housekeeping.assign")} footer={
        <>
          <Button variant="ghost" onClick={() => setAssignTask(null)}>{t("common.cancel")}</Button>
          <Button disabled={!assignTo} onClick={() => assignTask && action(assignTask.id, "assign", { assigned_to: assignTo })}>{t("common.save")}</Button>
        </>
      }>
        <div>
          <label className="text-xs font-medium block mb-1">{t("housekeeping.staff")}</label>
          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            <option value="">—</option>
            {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
      </Modal>
    </PageContainer>
  );
}
