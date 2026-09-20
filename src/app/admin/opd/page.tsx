"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { StatCard } from "@/components/ui/card";
import { Users, Activity, Clock, TrendingUp } from "lucide-react";

interface DoctorQueue {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  total: number;
  waiting: number;
  in_progress: number;
  completed: number;
  appointments: Appointment[];
}

interface Appointment {
  id: string;
  patient_id: string;
  patient: { id: string; name: string; uhid: string } | null;
  doctor: { id: string; full_name: string } | null;
  token_no: number;
  status: string;
  date_slot: string;
  consultation_type: string;
  created_at: string;
}

export default function AdminOPDPage() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [queues, setQueues] = useState<DoctorQueue[]>([]);
  const [allDoctors, setAllDoctors] = useState<Array<{ id: string; full_name: string; specialization: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [reassignTarget, setReassignTarget] = useState("");
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: doctors } = await supabase.from("profiles").select("id, full_name, specialization").eq("role", "doctor").order("full_name");
      setAllDoctors((doctors as Array<{ id: string; full_name: string; specialization: string }>) || []);

      const today = new Date().toISOString().split("T")[0];
      const { data: apts } = await supabase
        .from("appointments")
        .select("*, patient:patients(id, name, uhid), doctor:profiles(id, full_name)")
        .gte("date_slot", `${today}T00:00`)
        .lte("date_slot", `${today}T23:59`)
        .order("token_no");

      const grouped: Record<string, DoctorQueue> = {};
      (apts as Appointment[] || []).forEach((apt) => {
        const docId = apt.doctor?.id || "unknown";
        if (!grouped[docId]) {
          grouped[docId] = {
            doctor_id: docId,
            doctor_name: apt.doctor?.full_name || "Unknown",
            specialization: "",
            total: 0,
            waiting: 0,
            in_progress: 0,
            completed: 0,
            appointments: [],
          };
        }
        grouped[docId].total++;
        if (apt.status === "scheduled") grouped[docId].waiting++;
        if (apt.status === "in_progress") grouped[docId].in_progress++;
        if (apt.status === "completed") grouped[docId].completed++;
        grouped[docId].appointments.push(apt);
      });

      setQueues(Object.values(grouped));
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  async function reassignPatient() {
    if (!selectedAptId || !reassignTarget) return;
    try {
      const { error } = await supabase.from("appointments").update({ doctor_id: reassignTarget }).eq("id", selectedAptId);
      if (error) throw error;
      addToast("success", "Patient reassigned");
      setSelectedAptId(null);
      setReassignTarget("");
      loadData();
    } catch { addToast("error", "Failed to reassign"); }
  }

  const totalPatients = queues.reduce((sum, q) => sum + q.total, 0);
  const totalWaiting = queues.reduce((sum, q) => sum + q.waiting, 0);
  const totalInProgress = queues.reduce((sum, q) => sum + q.in_progress, 0);
  const totalCompleted = queues.reduce((sum, q) => sum + q.completed, 0);

  return (
    <PageContainer>
      <PageHeader title="OPD Management" subtitle="Admin dashboard for managing all OPD queues" />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <StatCard icon={<Users size={20} />} label="Total Patients" value={totalPatients} />
        <StatCard icon={<Clock size={20} />} label="Waiting" value={totalWaiting} />
        <StatCard icon={<Activity size={20} />} label="In Consultation" value={totalInProgress} />
        <StatCard icon={<TrendingUp size={20} />} label="Completed" value={totalCompleted} />
      </div>

      {loading ? (
        <Skeleton lines={8} />
      ) : queues.length === 0 ? (
        <EmptyState title="No OPD data today" description="No appointments found for today" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {queues.map((queue) => (
            <div key={queue.doctor_id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold">Dr. {queue.doctor_name}</h3>
                  <p className="text-xs text-muted-foreground">{queue.specialization || "OPD"}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="warning">{queue.waiting} waiting</Badge>
                  <Badge variant="info">{queue.in_progress} active</Badge>
                  <Badge variant="success">{queue.completed} done</Badge>
                </div>
              </div>

              <div className="space-y-2">
                {queue.appointments.map((apt) => (
                  <div key={apt.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${apt.status === "in_progress" ? "bg-yellow-50 dark:bg-yellow-900/20" : apt.status === "completed" ? "bg-green-50 dark:bg-green-900/20" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${apt.status === "in_progress" ? "bg-yellow-500 text-white" : apt.status === "completed" ? "bg-green-500 text-white" : "bg-muted"}`}>#{apt.token_no}</span>
                      <div>
                        <p className="text-sm font-medium">{apt.patient?.name}</p>
                        <p className="text-xs text-muted-foreground">{apt.patient?.uhid}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={apt.status === "scheduled" ? "info" : apt.status === "in_progress" ? "warning" : "success"}>
                        {apt.status}
                      </Badge>
                      {apt.status === "scheduled" && (
                        <button
                          onClick={() => setSelectedAptId(apt.id)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Reassign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reassign Modal */}
      {selectedAptId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg">Reassign Patient</h3>
            <Select
              value={reassignTarget}
              onChange={(e) => setReassignTarget(e.target.value)}
              options={[
                { value: "", label: "Select new doctor" },
                ...allDoctors.map(d => ({ value: d.id, label: `Dr. ${d.full_name} (${d.specialization || "—"})` }))
              ]}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setSelectedAptId(null)}>Cancel</Button>
              <Button onClick={reassignPatient} disabled={!reassignTarget}>Reassign</Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
