"use client";

import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBar } from "@/components/ui/search-bar";
import { PageHeader, PageContainer } from "@/components/ui/page";
import type { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { UserRound, Calendar, ClipboardList, Trash2 } from "lucide-react";

export default function ReceptionPage() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [patients, setPatients] = useState<Array<{ id: string; name: string; uhid: string; phone: string; dob: string; gender: string; address: string; blood_group: string; allergies: string }>>([]);
  const [doctors, setDoctors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", dob: "", gender: "male", address: "", blood_group: "", allergies: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedConsultationType, setSelectedConsultationType] = useState("opd");
  const [appointments, setAppointments] = useState<Array<{ id: string; patient: { name: string; uhid: string }; doctor: { full_name: string }; token_no: number; status: string; date_slot: string }>>([]);
  const [queueData, setQueueData] = useState<Array<{ doctor: { full_name: string; specialization: string }; total: number; current: number | null; appointments: any[] }>>([]);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    try {
      const { data: p } = await supabase.from("patients").select("*").order("name");
      setPatients((p as any[]) || []);
      const { data: d } = await supabase.from("profiles").select("*").eq("role", "doctor").order("full_name");
      setDoctors((d as Profile[]) || []);
    } catch { /* ignore */ }
    try {
      const res = await fetch("/api/reception/today-queue");
      if (res.ok) {
        const data = await res.json();
        setQueueData(data.doctors || []);
        const allAppts = (data.doctors || []).flatMap((d: any) => (d.appointments || []));
        setAppointments(allAppts);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  async function handleSavePatient() {
    if (!form.full_name || !form.phone || !form.dob || !form.gender) return;
    setSubmitting(true);
    try {
      const existing = patients.find(p => p.phone === form.phone);
      if (existing && !editingId) {
        addToast("error", "Patient with this phone already exists");
        return;
      }
      if (editingId) {
        const { error } = await supabase.from("patients").update({
          full_name: form.full_name, phone: form.phone, dob: form.dob,
          gender: form.gender, address: form.address || "", blood_group: form.blood_group || "",
          allergies: form.allergies || ""
        }).eq("id", editingId);
        if (error) throw error;
        addToast("success", t("reception.patientSaved"));
      } else {
        const year = new Date().getFullYear();
        const { data: last } = await supabase.from("patients").select("uhid").order("created_at", { ascending: false }).limit(1);
        let seq = 1;
        if (last && last.length > 0) {
          const lastSeq = parseInt(last[0].uhid.substring(5), 10);
          if (last[0].uhid.substring(0, 4) === String(year)) seq = lastSeq + 1;
        }
        const uhid = `${year}-${String(seq).padStart(6, "0")}`;
        const { error } = await supabase.from("patients").insert({
          uhid, full_name: form.full_name, phone: form.phone, dob: form.dob,
          gender: form.gender, address: form.address || "", blood_group: form.blood_group || "",
          allergies: form.allergies || ""
        });
        if (error) throw error;
        addToast("success", t("reception.patientRegistered"));
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ full_name: "", phone: "", dob: "", gender: "male", address: "", blood_group: "", allergies: "" });
      loadData();
    } catch (err: unknown) { addToast("error", (err as Error).message); }
    finally { setSubmitting(false); }
  }

  async function handleBookAppointment() {
    if (!selectedPatient || !selectedDoctor || !selectedDate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reception/book-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatient,
          doctor_id: selectedDoctor,
          date_slot: selectedDate,
          consultation_type: selectedConsultationType,
          notes: ""
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast("success", `${t("reception.tokenAssigned")} #${data.token_no}`);
      setSelectedPatient("");
      setSelectedDoctor("");
      setSelectedDate("");
      loadData();
    } catch (err: unknown) { addToast("error", (err as Error).message); }
    finally { setSubmitting(false); }
  }

  async function handleDeletePatient(id: string) {
    try {
      const { error } = await supabase.from("patients").delete().eq("id", id);
      if (error) throw error;
      addToast("success", "Patient deleted");
      loadData();
    } catch { addToast("error", "Delete failed"); }
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.uhid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader title={t("reception.title")} subtitle={t("reception.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><UserRound size={20} /> {t("reception.registerPatient")}</h2>
            <Button onClick={() => { setEditingId(null); setForm({ full_name: "", phone: "", dob: "", gender: "male", address: "", blood_group: "", allergies: "" }); setShowForm(true); }}>{t("reception.newPatient")}</Button>
          </div>

          <SearchBar value={search} onChange={setSearch} placeholder={t("reception.searchPlaceholder")} />

          {showForm && (
            <form onSubmit={(e) => { e.preventDefault(); handleSavePatient(); }} className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-semibold">{editingId ? "Edit Patient" : t("reception.registerPatient")}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input placeholder={t("reception.fullName")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                <Input placeholder={t("reception.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />
                <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as "male" | "female" | "other" })} options={[{ value: "male", label: t("reception.male") }, { value: "female", label: t("reception.female") }, { value: "other", label: t("reception.other") }]} />
                <Input placeholder={t("reception.address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <Input placeholder="Blood Group" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} />
                <Input placeholder={t("reception.allergies")} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : t("reception.savePatient")}</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
              </div>
            </form>
          )}

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {filteredPatients.length === 0 ? (
              <EmptyState title={t("reception.patientNotFound")} description="" />
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">UHID</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredPatients.slice(0, 8).map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.uhid}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.phone}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => { setEditingId(p.id); setForm({ full_name: p.name, phone: p.phone, dob: p.dob || "", gender: p.gender as "male" | "female" | "other", address: p.address || "", blood_group: p.blood_group || "", allergies: p.allergies || "" }); setShowForm(true); }} className="text-blue-600 text-xs hover:underline">Edit</button>
                        <button onClick={() => handleDeletePatient(p.id)} className="text-red-600 text-xs hover:underline ml-2"><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Calendar size={20} /> Book Appointment</h2>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)} options={[{ value: "", label: t("reception.selectPatient") }, ...patients.map(p => ({ value: p.id, label: `${p.name} (${p.uhid})` }))]} />
            <Select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)} options={[{ value: "", label: t("reception.selectDoctor") }, ...doctors.map(d => ({ value: d.id, label: `Dr. ${d.full_name} (${d.specialization || "—"})` }))]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input type="datetime-local" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} required />
              <Select value={selectedConsultationType} onChange={(e) => setSelectedConsultationType(e.target.value)} options={[{ value: "opd", label: t("reception.opd") }, { value: "emergency", label: t("reception.emergency") }, { value: "follow_up", label: t("reception.followUp") }]} />
            </div>
            <Button onClick={handleBookAppointment} disabled={submitting || !selectedPatient || !selectedDoctor || !selectedDate}>
              {submitting ? "Booking..." : t("reception.book")}
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/50 font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><ClipboardList size={18} /> {t("reception.todayQueue")}</span>
              <Badge variant="info">{appointments.length}</Badge>
            </div>
            {appointments.length === 0 ? (
              <EmptyState title={t("reception.noPatientsToday")} description="" />
            ) : (
              <div className="divide-y divide-border">
                {appointments.map((apt) => (
                  <div key={apt.id} className={`px-4 py-3 flex items-center justify-between ${apt.status === "in_progress" ? "bg-yellow-50 dark:bg-yellow-900/20" : apt.status === "completed" ? "bg-green-50 dark:bg-green-900/20" : ""}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${apt.status === "in_progress" ? "bg-primary text-primary-foreground" : apt.status === "completed" ? "bg-green-500 text-white" : "bg-muted"}`}>#{apt.token_no}</span>
                      <div>
                        <p className="font-medium">{apt.patient?.name}</p>
                        <p className="text-xs text-muted-foreground">{apt.patient?.uhid}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={apt.status === "scheduled" ? "info" : apt.status === "in_progress" ? "warning" : apt.status === "completed" ? "success" : "destructive"}>{apt.status}</Badge>
                      <p className="text-xs text-muted-foreground">Dr. {apt.doctor?.full_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
