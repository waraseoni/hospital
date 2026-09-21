"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { UserRound, BedDouble, Search, Plus, CheckCircle } from "lucide-react";

interface Admission {
  id: string;
  patient_id: string;
  doctor_id: string;
  bed_id: string | null;
  admission_date: string;
  discharge_date: string | null;
  ward_type: string;
  status: string;
  diagnosis: string;
  notes: string;
  discharge_summary: string;
  total_charges: number;
  patient?: { name: string; uhid: string; phone: string };
  doctor?: { full_name: string };
  bed?: { ward_name: string; bed_number: string };
}

interface Bed {
  id: string;
  ward_name: string;
  bed_number: string;
  bed_type: string;
  is_occupied: boolean;
  current_patient_id: string | null;
  daily_rate: number;
}

export default function AdminIPDPage() {
  const { t } = useI18n();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmit, setShowAdmit] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<{ id: string; name: string; uhid: string; phone: string }[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string; uhid: string } | null>(null);
  const [selectedBed, setSelectedBed] = useState<string>("");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctors, setDoctors] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<{ id: string; full_name: string } | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [wardType, setWardType] = useState("general");
  const [admitting, setAdmitting] = useState(false);
  const [dischargeModal, setDischargeModal] = useState<Admission | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [discharging, setDischarging] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const [admissionsRes, bedsRes, doctorsRes] = await Promise.all([
      supabase
        .from("admissions")
        .select("*, patient:patients(name, uhid, phone), doctor:profiles(full_name), bed:beds(ward_name, bed_number)")
        .order("admission_date", { ascending: false }),
      supabase.from("beds").select("*").order("ward_name"),
      supabase.from("profiles").select("id, full_name").eq("role", "doctor").order("full_name"),
    ]);
    setAdmissions((admissionsRes.data as Admission[]) || []);
    setBeds((bedsRes.data as Bed[]) || []);
    setDoctors((doctorsRes.data as { id: string; full_name: string }[]) || []);
    setLoading(false);
  }

  async function searchPatientsForAdmit() {
    if (patientSearch.length < 2) { setPatients([]); return; }
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("id, name, uhid, phone").or(`name.ilike.%${patientSearch}%,uhid.ilike.%${patientSearch}%`).limit(10);
    setPatients((data as { id: string; name: string; uhid: string; phone: string }[]) || []);
  }

  useEffect(() => {
    const timer = setTimeout(() => searchPatientsForAdmit(), 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const availableBeds = beds.filter((b) => !b.is_occupied);

  async function handleAdmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor) { addToast("error", "Select patient and doctor"); return; }
    setAdmitting(true);
    const supabase = createClient();

    const { data: admission, error } = await supabase.from("admissions").insert({
      patient_id: selectedPatient.id,
      doctor_id: selectedDoctor.id,
      bed_id: selectedBed || null,
      ward_type: wardType,
      diagnosis,
    }).select("id").single();

    if (!error && admission) {
      if (selectedBed) {
        await supabase.from("beds").update({ is_occupied: true, current_patient_id: selectedPatient.id }).eq("id", selectedBed);
      }
      addToast("success", "Patient admitted");
      setShowAdmit(false);
      resetForm();
      loadData();
    } else {
      addToast("error", error?.message || "Admission failed");
    }
    setAdmitting(false);
  }

  async function handleDischarge() {
    if (!dischargeModal) return;
    setDischarging(true);
    const supabase = createClient();

    const { error } = await supabase.from("admissions").update({
      status: "discharged",
      discharge_date: new Date().toISOString(),
      discharge_summary: dischargeSummary,
    }).eq("id", dischargeModal.id);

    if (!error) {
      if (dischargeModal.bed_id) {
        await supabase.from("beds").update({ is_occupied: false, current_patient_id: null }).eq("id", dischargeModal.bed_id);
      }
      addToast("success", "Patient discharged");
      setDischargeModal(null);
      setDischargeSummary("");
      loadData();
    } else {
      addToast("error", "Discharge failed");
    }
    setDischarging(false);
  }

  function resetForm() {
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setSelectedBed("");
    setDiagnosis("");
    setPatientSearch("");
    setDoctorSearch("");
    setWardType("general");
  }

  const active = admissions.filter((a) => a.status === "active");
  const discharged = admissions.filter((a) => a.status === "discharged");

  if (loading) return <PageContainer><Skeleton lines={6} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title="IPD Management"
        subtitle="In-Patient Department admissions and discharges"
        actions={
          <Button size="sm" onClick={() => setShowAdmit(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Admit Patient
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Active" value={String(active.length)} icon={<BedDouble size={18} />} />
        <StatCard label="Discharged" value={String(discharged.length)} icon={<CheckCircle size={18} />} />
        <StatCard label="Available Beds" value={String(availableBeds.length)} icon={<BedDouble size={18} />} />
        <StatCard label="Total Admissions" value={String(admissions.length)} icon={<UserRound size={18} />} />
      </div>

      <h3 className="text-sm font-semibold mb-3">Active Admissions</h3>
      {active.length === 0 ? (
        <EmptyState title="No active admissions" />
      ) : (
        <div className="space-y-2 mb-6">
          {active.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <UserRound size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium">{a.patient?.name} <span className="text-xs text-muted-foreground">({a.patient?.uhid})</span></p>
                  <p className="text-xs text-muted-foreground">Dr. {a.doctor?.full_name} | {a.ward_type} | Dx: {a.diagnosis || "—"}</p>
                  {a.bed && <p className="text-xs text-muted-foreground">Bed: {a.bed.ward_name}-{a.bed.bed_number}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">Active</Badge>
                <Button variant="outline" size="sm" onClick={() => setDischargeModal(a)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Discharge
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-sm font-semibold mb-3">Recent Discharges</h3>
      {discharged.length === 0 ? (
        <EmptyState title="No discharges yet" />
      ) : (
        <div className="space-y-2">
          {discharged.slice(0, 10).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border bg-card p-3 opacity-70">
              <div>
                <p className="text-sm font-medium">{a.patient?.name} <span className="text-xs text-muted-foreground">({a.patient?.uhid})</span></p>
                <p className="text-xs text-muted-foreground">Dr. {a.doctor?.full_name} | Discharged: {a.discharge_date ? new Date(a.discharge_date).toLocaleDateString("en-IN") : "—"}</p>
              </div>
              <Badge variant="success">Discharged</Badge>
            </div>
          ))}
        </div>
      )}

      <Modal open={showAdmit} onOpenChange={() => setShowAdmit(false)} title="Admit Patient">
        <form onSubmit={handleAdmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Patient</label>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">{selectedPatient.name} ({selectedPatient.uhid})</span>
                <button type="button" onClick={() => setSelectedPatient(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search patient..." value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
                {patients.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-40 overflow-y-auto">
                    {patients.map((p) => (
                      <button key={p.id} type="button" onClick={() => { setSelectedPatient(p); setPatientSearch(""); setPatients([]); }} className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted text-left">
                        {p.name} ({p.uhid})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Doctor</label>
            {selectedDoctor ? (
              <div className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">Dr. {selectedDoctor.full_name}</span>
                <button type="button" onClick={() => setSelectedDoctor(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search doctor..." value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)} />
                {doctors.filter((d) => d.full_name.toLowerCase().includes(doctorSearch.toLowerCase())).length > 0 && doctorSearch && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-40 overflow-y-auto">
                    {doctors.filter((d) => d.full_name.toLowerCase().includes(doctorSearch.toLowerCase())).map((d) => (
                      <button key={d.id} type="button" onClick={() => { setSelectedDoctor(d); setDoctorSearch(""); }} className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted text-left">
                        Dr. {d.full_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Ward Type</label>
              <select value={wardType} onChange={(e) => setWardType(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="general">General</option>
                <option value="semi_private">Semi-Private</option>
                <option value="private">Private</option>
                <option value="icu">ICU</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Bed (Optional)</label>
              <select value={selectedBed} onChange={(e) => setSelectedBed(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="">No bed</option>
                {availableBeds.map((b) => (
                  <option key={b.id} value={b.id}>{b.ward_name}-{b.bed_number} (₹{b.daily_rate}/day)</option>
                ))}
              </select>
            </div>
          </div>

          <Input label="Diagnosis" placeholder="Primary diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdmit(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={admitting || !selectedPatient || !selectedDoctor}>{admitting ? "Admitting..." : "Admit Patient"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!dischargeModal} onOpenChange={() => setDischargeModal(null)} title="Discharge Patient">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Discharge <strong>{dischargeModal?.patient?.name}</strong> ({dischargeModal?.patient?.uhid})?
          </p>
          <Input label="Discharge Summary" placeholder="Enter discharge summary..." value={dischargeSummary} onChange={(e) => setDischargeSummary(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDischargeModal(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleDischarge} disabled={discharging}>{discharging ? "Discharging..." : "Confirm Discharge"}</Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
