"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export default function PatientAppointmentsPage() {
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<Array<{ id: string; date_slot: string; token_no: number; status: string; doctor: { full_name: string } | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ doctor_id: "", date_slot: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: docs } = await supabase.from("profiles").select("*").eq("role", "doctor");
    setDoctors((docs as Profile[]) || []);

    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
    if (patient) {
      const { data: apts } = await supabase.from("appointments").select("*, doctor:profiles(full_name)")
        .eq("patient_id", patient.id).order("date_slot", { ascending: false });
      setAppointments((apts as Array<{ id: string; date_slot: string; token_no: number; status: string; doctor: { full_name: string } | null }>) || []);
    }
    setLoading(false);
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
    if (!patient) { setSubmitting(false); return; }

    const dateOnly = form.date_slot.split("T")[0];
    const { data: existing } = await supabase.from("appointments").select("token_no")
      .eq("doctor_id", form.doctor_id).gte("date_slot", `${dateOnly}T00:00`).lte("date_slot", `${dateOnly}T23:59`)
      .order("token_no", { ascending: false }).limit(1);

    const tokenNo = existing && existing.length > 0 ? existing[0].token_no + 1 : 1;

    await supabase.from("appointments").insert({
      patient_id: patient.id,
      doctor_id: form.doctor_id,
      date_slot: form.date_slot,
      token_no: tokenNo,
    });

    setForm({ doctor_id: "", date_slot: "" });
    load();
    setSubmitting(false);
  }

  async function handleCancel(id: string) {
    if (!window.confirm("Cancel this appointment?")) return;
    const supabase = createClient();
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Book Appointment</h1>

      <form onSubmit={handleBook} className="mb-8 rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Doctor</label>
            <select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required>
              <option value="">-- Select Doctor --</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>Dr. {d.full_name} {d.specialization ? `(${d.specialization})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date & Time</label>
            <input type="datetime-local" value={form.date_slot} onChange={(e) => setForm({ ...form, date_slot: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
          </div>
        </div>
        <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {submitting ? "Booking..." : "Book Appointment"}
        </button>
      </form>

      <h2 className="text-lg font-semibold mb-3">My Appointments</h2>
      <div className="space-y-2">
        {appointments.map(apt => (
          <div key={apt.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-medium">Dr. {apt.doctor?.full_name}</p>
              <p className="text-xs text-muted-foreground">{new Date(apt.date_slot).toLocaleDateString("en-IN")} | Token #{apt.token_no}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${apt.status === "completed" ? "bg-green-100 text-green-800" : apt.status === "cancelled" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                {apt.status}
              </span>
              {(apt.status === "scheduled" || apt.status === "in_progress") && (
                <button onClick={() => handleCancel(apt.id)} className="rounded-lg border border-border px-2 py-0.5 text-xs text-destructive hover:bg-destructive/10">
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
        {appointments.length === 0 && <p className="text-sm text-muted-foreground">No appointments yet</p>}
      </div>
    </div>
  );
}
