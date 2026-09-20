"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { PageContainer } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Droplets, AlertTriangle, FileText, TestTube, Activity, Calendar } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  phone: string;
  dob: string;
  gender: string;
  blood_group: string;
  medical_history: Record<string, unknown>;
  uhid: string;
}

interface Prescription {
  id: string;
  diagnosis: string;
  notes: string;
  created_at: string;
  doctor_name: string;
  doctor_specialization: string;
}

interface LabReport {
  id: string;
  test_name: string;
  status: string;
  result: string;
  created_at: string;
}

interface Vital {
  id: string;
  bp_systolic: number;
  bp_diastolic: number;
  pulse: number;
  spo2: number;
  temperature: number;
  recorded_at: string;
  nurse_name: string;
}

interface Appointment {
  id: string;
  date_slot: string;
  status: string;
  token_no: number;
  consultation_type: string;
  doctor_name: string;
  doctor_specialization: string;
}

export default function PatientEMRPage() {
  const { t } = useI18n();
  const params = useParams();
  const patientId = params?.patientId as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "prescriptions" | "lab" | "vitals" | "appointments">("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) loadData();
  }, [patientId]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctors/patient-history/${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        setPrescriptions(data.prescriptions || []);
        setLabReports(data.labReports || []);
        setVitals(data.vitals || []);
        setAppointments(data.appointments || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
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

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading patient records...</div>
        </div>
      </PageContainer>
    );
  }

  if (!patient) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-destructive">Patient not found</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Patient Header */}
      <div className="mb-6 rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{patient.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>UHID: {patient.uhid}</span>
                <span className="flex items-center gap-1"><Phone size={14} /> {patient.phone}</span>
                <span>{patient.gender} | {calculateAge(patient.dob)}</span>
                {patient.blood_group && (
                  <span className="flex items-center gap-1"><Droplets size={14} /> {patient.blood_group}</span>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={loadData}>Refresh</Button>
        </div>

        {patient.medical_history && Object.keys(patient.medical_history).length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
              <AlertTriangle size={16} />
              <span className="font-semibold text-sm">Medical History</span>
            </div>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              {JSON.stringify(patient.medical_history)}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b pb-2">
        {(["overview", "prescriptions", "lab", "vitals", "appointments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab === "overview" && "Overview"}
            {tab === "prescriptions" && <span className="flex items-center gap-1"><FileText size={14} /> Prescriptions ({prescriptions.length})</span>}
            {tab === "lab" && <span className="flex items-center gap-1"><TestTube size={14} /> Lab Reports ({labReports.length})</span>}
            {tab === "vitals" && <span className="flex items-center gap-1"><Activity size={14} /> Vitals ({vitals.length})</span>}
            {tab === "appointments" && <span className="flex items-center gap-1"><Calendar size={14} /> Appointments ({appointments.length})</span>}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4">
            <h3 className="font-semibold text-base mb-3">Latest Vitals</h3>
            {vitals.length > 0 ? (
              <div className="space-y-2">
                <div className={`flex justify-between ${isAbnormal(String(vitals[0].bp_systolic), "bp_systolic") ? "text-destructive font-bold" : ""}`}>
                  <span className="text-sm">BP</span>
                  <span className="text-sm font-medium">{vitals[0].bp_systolic}/{vitals[0].bp_diastolic} mmHg</span>
                </div>
                <div className={`flex justify-between ${isAbnormal(String(vitals[0].spo2), "spo2") ? "text-destructive font-bold" : ""}`}>
                  <span className="text-sm">SpO2</span>
                  <span className="text-sm font-medium">{vitals[0].spo2}%</span>
                </div>
                <div className={`flex justify-between ${isAbnormal(String(vitals[0].temperature), "temperature") ? "text-destructive font-bold" : ""}`}>
                  <span className="text-sm">Temp</span>
                  <span className="text-sm font-medium">{vitals[0].temperature}°F</span>
                </div>
                <div className={`flex justify-between ${isAbnormal(String(vitals[0].pulse), "pulse") ? "text-destructive font-bold" : ""}`}>
                  <span className="text-sm">Pulse</span>
                  <span className="text-sm font-medium">{vitals[0].pulse} bpm</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Recorded: {new Date(vitals[0].recorded_at).toLocaleString()}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No vitals recorded yet</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-base mb-3">Recent Prescriptions</h3>
            {prescriptions.length > 0 ? (
              <div className="space-y-3">
                {prescriptions.slice(0, 3).map((p) => (
                  <div key={p.id} className="border-b pb-2 last:border-0">
                    <p className="text-sm font-medium">{p.diagnosis}</p>
                    <p className="text-xs text-muted-foreground">Dr. {p.doctor_name} | {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No prescriptions yet</p>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-base mb-3">Recent Lab Reports</h3>
            {labReports.length > 0 ? (
              <div className="space-y-3">
                {labReports.slice(0, 3).map((r) => (
                  <div key={r.id} className="border-b pb-2 last:border-0">
                    <p className="text-sm font-medium">{r.test_name}</p>
                    <p className="text-xs text-muted-foreground">{r.status} | {new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No lab reports yet</p>
            )}
          </Card>
        </div>
      )}

      {/* Prescriptions Tab */}
      {activeTab === "prescriptions" && (
        <div className="space-y-4">
          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No prescriptions found</p>
          ) : (
            prescriptions.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{p.diagnosis}</p>
                    <p className="text-sm text-muted-foreground mt-1">{p.notes}</p>
                  </div>
                  <Badge variant="info">{new Date(p.created_at).toLocaleDateString()}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Dr. {p.doctor_name} ({p.doctor_specialization})</p>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Lab Reports Tab */}
      {activeTab === "lab" && (
        <div className="space-y-4">
          {labReports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No lab reports found</p>
          ) : (
            labReports.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{r.test_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{r.result}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={r.status === "completed" ? "success" : "warning"}>{r.status}</Badge>
                    <Badge variant="info">{new Date(r.created_at).toLocaleDateString()}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Vitals Tab */}
      {activeTab === "vitals" && (
        <div className="space-y-4">
          {vitals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No vitals recorded yet</p>
          ) : (
            vitals.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-4 gap-4">
                    <div className={isAbnormal(String(v.bp_systolic), "bp_systolic") ? "text-destructive font-bold" : ""}>
                      <p className="text-xs text-muted-foreground">BP</p>
                      <p className="font-medium">{v.bp_systolic}/{v.bp_diastolic}</p>
                    </div>
                    <div className={isAbnormal(String(v.spo2), "spo2") ? "text-destructive font-bold" : ""}>
                      <p className="text-xs text-muted-foreground">SpO2</p>
                      <p className="font-medium">{v.spo2}%</p>
                    </div>
                    <div className={isAbnormal(String(v.temperature), "temperature") ? "text-destructive font-bold" : ""}>
                      <p className="text-xs text-muted-foreground">Temp</p>
                      <p className="font-medium">{v.temperature}°F</p>
                    </div>
                    <div className={isAbnormal(String(v.pulse), "pulse") ? "text-destructive font-bold" : ""}>
                      <p className="text-xs text-muted-foreground">Pulse</p>
                      <p className="font-medium">{v.pulse} bpm</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="info">{new Date(v.recorded_at).toLocaleDateString()}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">By: {v.nurse_name}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === "appointments" && (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No appointments found</p>
          ) : (
            appointments.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      #{a.token_no}
                    </div>
                    <div>
                      <p className="font-medium">Dr. {a.doctor_name}</p>
                      <p className="text-xs text-muted-foreground">{a.doctor_specialization} | {a.consultation_type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={a.status === "completed" ? "success" : a.status === "in_progress" ? "warning" : "info"}>
                      {a.status.replace("_", " ")}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(a.date_slot).toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </PageContainer>
  );
}
