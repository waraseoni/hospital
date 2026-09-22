"use client";

import { useEffect, useState } from "react";
import type { HousekeepingTask } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Play, CheckCircle2, UserPlus } from "lucide-react";

type StaffOpt = { id: string; full_name: string; role: string };

export default function StaffHousekeepingPage() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [staff, setStaff] = useState<StaffOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTask, setAssignTask] = useState<HousekeepingTask | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [tk, st] = await Promise.all([
      fetch("/api/housekeeping").then(r => r.json()).catch(() => ({ tasks: [] })),
      fetch("/api/staff-directory").then(r => r.json()).catch(() => ({ staff: [] })),
    ]);
    setTasks(tk.tasks || []);
    setStaff((st.staff || []).filter((s: StaffOpt) => ["staff", "nurse"].includes(s.role)));
    setLoading(false);
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

  const open = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
  const statusVariant = (s: string) =>
    s === "completed" ? "success" : s === "pending" ? "warning" : s === "in_progress" ? "info" : "outline";

  if (loading) return <PageContainer><Skeleton lines={6} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("housekeeping.title")} subtitle={t("housekeeping.staffSubtitle")} />

      {open.length === 0 ? (
        <EmptyState title={t("housekeeping.none")} description={t("ui.noData")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {open.map(tk => (
            <div key={tk.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{tk.room_label}</p>
                  <p className="text-xs text-muted-foreground">{tk.task_type} · {tk.priority}</p>
                </div>
                <Badge variant={statusVariant(tk.status) as "success" | "warning" | "info" | "outline"}>{tk.status}</Badge>
              </div>
              {tk.notes && <p className="text-sm text-muted-foreground">{tk.notes}</p>}
              <div className="flex flex-wrap gap-2">
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
            </div>
          ))}
        </div>
      )}

      {assignTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setAssignTask(null); }}>
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">{t("housekeeping.assign")}</h3>
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
              <option value="">—</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAssignTask(null)}>{t("common.cancel")}</Button>
              <Button disabled={!assignTo} onClick={() => action(assignTask.id, "assign", { assigned_to: assignTo })}>{t("common.save")}</Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
