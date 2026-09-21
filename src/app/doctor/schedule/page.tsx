"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, Trash2, Clock } from "lucide-react";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface Schedule {
  id: string;
  doctor_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  is_active: boolean;
}

export default function DoctorSchedulePage() {
  const { t } = useI18n();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ weekday: 1, start_time: "09:00", end_time: "17:00", slot_minutes: 15 });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadSchedules(); }, []);

  async function loadSchedules() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("doctor_schedules")
      .select("*")
      .eq("doctor_id", user.id)
      .order("weekday")
      .order("start_time");
    setSchedules(data || []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("doctor_schedules").insert({
      doctor_id: user.id,
      weekday: form.weekday,
      start_time: form.start_time,
      end_time: form.end_time,
      slot_minutes: form.slot_minutes,
    });

    if (error) {
      addToast("error", error.message);
    } else {
      addToast("success", "Schedule added");
      setShowForm(false);
      setForm({ weekday: 1, start_time: "09:00", end_time: "17:00", slot_minutes: 15 });
      loadSchedules();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("doctor_schedules").delete().eq("id", id);
    if (!error) {
      addToast("success", "Schedule removed");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    }
    setDeleteId(null);
  }

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from("doctor_schedules").update({ is_active: !current }).eq("id", id);
    loadSchedules();
  }

  function formatTime(time: string) {
    const [h, m] = time.split(":").map(Number);
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  function calcSlots(start: string, end: string, slotMins: number) {
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    const total = ((eH * 60 + eM) - (sH * 60 + sM)) / slotMins;
    return Math.max(0, Math.floor(total));
  }

  const grouped = WEEKDAYS.map((day, i) => ({
    day,
    weekday: i,
    items: schedules.filter((s) => s.weekday === i),
  }));

  if (loading) return <PageContainer><Skeleton lines={6} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title="My Schedule"
        subtitle="Manage your weekly OPD schedule"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Slot
          </Button>
        }
      />

      <div className="space-y-3">
        {grouped.map(({ day, weekday, items }) => (
          <div key={weekday} className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">{day}</h3>
              {items.length > 0 ? (
                <Badge variant="outline">{items.reduce((acc, s) => acc + calcSlots(s.start_time, s.end_time, s.slot_minutes), 0)} slots</Badge>
              ) : (
                <Badge variant="muted">Off</Badge>
              )}
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">No schedule</p>
            ) : (
              <div className="space-y-2">
                {items.map((s) => (
                  <div key={s.id} className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${s.is_active ? "bg-muted/50" : "bg-muted/20 opacity-50"}`}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                      <Badge variant="outline" className="text-xs">{s.slot_minutes}min</Badge>
                      {!s.is_active && <Badge variant="muted">Disabled</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(s.id, s.is_active)}>
                        {s.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={showForm} onOpenChange={() => setShowForm(false)} title="Add Schedule Slot">
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Day</label>
            <select
              value={form.weekday}
              onChange={(e) => setForm({ ...form, weekday: parseInt(e.target.value) })}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {WEEKDAYS.map((day, i) => (
                <option key={i} value={i}>{day}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Start Time</label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">End Time</label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Slot Duration (minutes)</label>
            <Input type="number" min={5} max={60} value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: parseInt(e.target.value) || 15 })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? t("common.saving") : t("common.save")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Remove Schedule">
        <p className="text-sm text-muted-foreground mb-4">Remove this time slot?</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>{t("common.delete")}</Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
