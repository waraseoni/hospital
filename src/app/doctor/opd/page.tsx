"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import Link from "next/link";
import { UserRound, Activity, FileText, Beaker, Heart } from "lucide-react";

interface PatientHistory {
  patient: { id: string; name: string; uhid: string; phone: string; gender: string; dob: string; blood_group: string; allergies: string; medical_history: any[] };
  prescriptions: Array<{ id: string; diagnosis: string; created_at: string; doctor: { full_name: string } | null }>;
  labReports: Array<{ id: string; test_name: string; status: string; created_at: string }>;
  vitals: Array<{ id: string; bp_systolic: number; bp_diastolic: number; pulse: number; spo2: number; temperature: number; recorded_at: string; nurse: { full_name: string } | null }>;
}

export default function DoctorOPDPage() {
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientHistory, setPatientHistory] = useState<PatientHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadAppointments(); }, []);

  async function loadAppointments() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase.from("appointments").select("*, patient:patients(name, uhid, phone, id)").eq("doctor_id", user.id).gte("date_slot", `${today}T00:00`).lte("date_slot", `${today}T23:59`).in("status", ["scheduled", "in_progress"]).order("token_no");
    setAppointments((data as any[]) || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("appointments").update({ status }).eq("id", id);
    addToast("success", status === "in_progress" ? "Consultation started" : status === "completed" ? "Completed" : status === "cancelled" ? "Cancelled" : "Re-queued");
    loadAppointments();
  }

  async function nextPatient() {
    const current = appointments.find(a => a.status === "in_progress");
    const next = appointments.find(a => a.status === "scheduled");
    if (current) await updateStatus(current.id, "completed");
    if (next) await updateStatus(next.id, "in_progress");
  }

  async function callBackPatient(id: string) {
    const supabase = createClient();
    await supabase.from("appointments").update({ status: "scheduled" }).eq("id", id);
    addToast("success", "Patient re-queued");
    loadAppointments();
  }

  function getTimeElapsed(dateSlot: string) {
    const start = new Date(dateSlot);
    const now = new Date();
    const diff = Math.floor((now.getTime() - start.getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
  }

  async function showPatientHistory(patientId: string) {
    if (selectedPatientId === patientId) {
      setSelectedPatientId(null);
      setPatientHistory(null);
      return;
    }
    setSelectedPatientId(patientId);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/doctors/patient-history/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setPatientHistory(data);
      }
    } catch { /* ignore */ }
    setLoadingHistory(false);
  }

  function calculateAge(dob: string) {
    if (!dob) return "—";
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return `${age} years`;
  }

  function isAbnormal(v: string, type: string) {
    const n = parseFloat(v);
    if (type === "bp_systolic") return n > 140 || n < 90;
    if (type === "bp_diastolic") return n > 90 || n < 60;
    if (type === "spo2") return n < 95;
    if (type === "temperature") return n > 100.4 || n < 97;
    if (type === "pulse") return n > 100 || n < 60;
    return false;
  }

  return (
    <PageContainer>
      <PageHeader title={t("opd.title")} />
      <div className="grid gap-6 lg:grid-cols-3">
        {/* OPD Queue */}
        <div className={selectedPatientId ? "lg:col-span-1" : "lg:col-span-3"}>
          {loading ? <Skeleton lines={5} /> : appointments.length === 0 ? (
            <EmptyState title={t("opd.noAppointments")} description={t("ui.noData")} />
          ) : (
            <>
              {appointments.some(a => a.status === "in_progress") && (
                <div className="mb-4 flex items-center gap-3">
                  <Button onClick={nextPatient} className="bg-green-600 text-white hover:bg-green-700">
                    Next Patient →
                  </Button>
                  <span className="text-sm text-muted-foreground">{appointments.filter(a => a.status === "scheduled").length} patients waiting</span>
                </div>
              )}
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className={`group relative rounded-xl border bg-card p-4 ${apt.status === "in_progress" ? "border-yellow-400 dark:border-yellow-600" : "border-border"}`}>
                    {/* Hover Preview Tooltip */}
                    <div className="absolute left-0 top-full z-50 mt-1 hidden w-72 rounded-xl border border-border bg-card p-4 shadow-lg group-hover:block">
                      <div className="space-y-2 text-sm">
                        <p className="font-bold">{apt.patient?.name}</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <span className="text-muted-foreground">UHID:</span><span>{apt.patient?.uhid}</span>
                          <span className="text-muted-foreground">Phone:</span><span>{apt.patient?.phone}</span>
                          <span className="text-muted-foreground">Token:</span><span>#{apt.token_no}</span>
                          <span className="text-muted-foreground">Status:</span><span>{apt.status}</span>
                          <span className="text-muted-foreground">Time:</span><span>{new Date(apt.date_slot).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${apt.status === "in_progress" ? "bg-yellow-500 text-white" : "bg-primary text-primary-foreground"}`}>#{apt.token_no}</div>
                        <div>
                          <p className="font-medium">{apt.patient?.name}</p>
                          <p className="text-xs text-muted-foreground">UHID: {apt.patient?.uhid} | {apt.patient?.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={apt.status === "scheduled" ? "info" : "warning"}>{apt.status.replace("_", " ")}</Badge>
                        {apt.status === "in_progress" && <span className="text-xs text-muted-foreground">{getTimeElapsed(apt.date_slot)}</span>}
                        {apt.status === "scheduled" && <Button size="sm" onClick={() => updateStatus(apt.id, "in_progress")}>{t("opd.startConsultation")}</Button>}
                        {apt.status === "in_progress" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => showPatientHistory(apt.patient?.id)}>
                              <UserRound size={14} className="mr-1" /> History
                            </Button>
                            <Link href={`/doctor/prescriptions/new?patient=${apt.patient_id}&appointment=${apt.id}`}><Button size="sm" variant="secondary">{t("opd.writePrescription")}</Button></Link>
                            <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => updateStatus(apt.id, "completed")}>{t("opd.complete")}</Button>
                            <Button size="sm" variant="ghost" onClick={() => callBackPatient(apt.id)}>Call Back</Button>
                            <Button size="sm" variant="ghost" onClick={() => updateStatus(apt.id, "cancelled")}>{t("opd.cancel")}</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Patient History Panel */}
        {selectedPatientId && (
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><UserRound size={20} /> Patient History</h2>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedPatientId(null); setPatientHistory(null); }}>Close</Button>
            </div>
            {loadingHistory ? <Skeleton lines={8} /> : patientHistory && (
              <>
                {/* Patient Profile */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{patientHistory.patient.name}</p></div>
                    <div><p className="text-xs text-muted-foreground">UHID</p><p className="font-medium">{patientHistory.patient.uhid}</p></div>
                    <div><p className="text-xs text-muted-foreground">Age</p><p className="font-medium">{calculateAge(patientHistory.patient.dob)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Gender</p><p className="font-medium capitalize">{patientHistory.patient.gender}</p></div>
                    <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{patientHistory.patient.phone}</p></div>
                    <div><p className="text-xs text-muted-foreground">Blood Group</p><p className="font-medium">{patientHistory.patient.blood_group || "—"}</p></div>
                    {patientHistory.patient.allergies && <div className="col-span-2"><p className="text-xs text-muted-foreground">Allergies</p><p className="font-medium text-red-600">{patientHistory.patient.allergies}</p></div>}
                  </div>
                </div>

                {/* Vitals */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Activity size={16} /> Vitals</h3>
                  {patientHistory.vitals.length === 0 ? <p className="text-sm text-muted-foreground">No vitals recorded</p> : (
                    <div className="space-y-2">
                      {patientHistory.vitals.map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                          <div className="flex gap-4">
                            <span className={isAbnormal(String(v.bp_systolic), "bp_systolic") ? "text-red-600 font-bold" : ""}>BP: {v.bp_systolic}/{v.bp_diastolic}</span>
                            <span className={isAbnormal(String(v.pulse), "pulse") ? "text-red-600 font-bold" : ""}>Pulse: {v.pulse}</span>
                            <span className={isAbnormal(String(v.spo2), "spo2") ? "text-red-600 font-bold" : ""}>SpO2: {v.spo2}%</span>
                            <span className={isAbnormal(String(v.temperature), "temperature") ? "text-red-600 font-bold" : ""}>Temp: {v.temperature}°F</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(v.recorded_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Prescriptions */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText size={16} /> Prescriptions</h3>
                  {patientHistory.prescriptions.length === 0 ? <p className="text-sm text-muted-foreground">No prescriptions</p> : (
                    <div className="space-y-2">
                      {patientHistory.prescriptions.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                          <div><p className="font-medium">{p.diagnosis}</p><p className="text-xs text-muted-foreground">Dr. {p.doctor?.full_name}</p></div>
                          <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lab Reports */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2"><Beaker size={16} /> Lab Reports</h3>
                  {patientHistory.labReports.length === 0 ? <p className="text-sm text-muted-foreground">No lab reports</p> : (
                    <div className="space-y-2">
                      {patientHistory.labReports.map((lr) => (
                        <div key={lr.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{lr.test_name}</span>
                            <Badge variant={lr.status === "finalized" ? "success" : "warning"}>{lr.status}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{new Date(lr.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
