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
import { AlertTriangle, Plus, Phone, Clock, CheckCircle } from "lucide-react";

interface EmergencyCase {
  id: string;
  patient_id: string | null;
  patient_name: string;
  patient_phone: string;
  age: number | null;
  gender: string | null;
  chief_complaint: string;
  triage_level: string;
  status: string;
  notes: string;
  arrived_at: string;
  assigned_doctor?: { full_name: string } | null;
}

const TRIAGE_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  urgent: "bg-orange-100 text-orange-700 border-orange-200",
  non_urgent: "bg-yellow-100 text-yellow-700 border-yellow-200",
  stable: "bg-green-100 text-green-700 border-green-200",
};

const STATUS_LABELS: Record<string, string> = {
  waiting: "Waiting",
  in_treatment: "In Treatment",
  stabilized: "Stabilized",
  referred: "Referred",
  discharged: "Discharged",
};

export default function EmergencyPage() {
  const { t } = useI18n();
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patient_name: "", patient_phone: "", age: "", gender: "male",
    chief_complaint: "", triage_level: "urgent", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("emergency_cases")
      .select("*, assigned_doctor:profiles(full_name)")
      .order("arrived_at", { ascending: false });
    setCases((data as unknown as EmergencyCase[]) || []);
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("emergency_cases").insert({
      patient_name: form.patient_name,
      patient_phone: form.patient_phone,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender,
      chief_complaint: form.chief_complaint,
      triage_level: form.triage_level,
      notes: form.notes,
    });
    if (!error) {
      addToast("success", "Emergency case registered");
      setShowForm(false);
      setForm({ patient_name: "", patient_phone: "", age: "", gender: "male", chief_complaint: "", triage_level: "urgent", notes: "" });
      loadCases();
    } else {
      addToast("error", error.message);
    }
    setSaving(false);
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient();
    const update: Record<string, unknown> = { status };
    if (status === "in_treatment") update.treated_at = new Date().toISOString();
    if (status === "discharged") update.discharged_at = new Date().toISOString();
    await supabase.from("emergency_cases").update(update).eq("id", id);
    loadCases();
  }

  const waiting = cases.filter((c) => c.status === "waiting");
  const inTreatment = cases.filter((c) => c.status === "in_treatment");
  const discharged = cases.filter((c) => c.status === "discharged");
  const critical = cases.filter((c) => c.triage_level === "critical" && c.status !== "discharged" && c.status !== "referred");

  if (loading) return <PageContainer><Skeleton lines={6} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title="Emergency / ER Triage"
        subtitle="Register and manage emergency cases"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Register Emergency
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard icon={<AlertTriangle size={18} />} label="Waiting" value={String(waiting.length)} />
        <StatCard icon={<Clock size={18} />} label="In Treatment" value={String(inTreatment.length)} />
        <StatCard icon={<CheckCircle size={18} />} label="Discharged" value={String(discharged.length)} />
        <StatCard icon={<AlertTriangle size={18} />} label="Critical" value={String(critical.length)} />
      </div>

      {cases.length === 0 ? (
        <EmptyState title="No emergency cases" description="All clear for now" />
      ) : (
        <div className="space-y-2">
          {cases.slice(0, 20).map((c) => (
            <div key={c.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{c.patient_name}</p>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${TRIAGE_COLORS[c.triage_level]}`}>
                        {c.triage_level.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.age ? `${c.age}y, ` : ""}{c.gender} | {c.chief_complaint}
                    </p>
                    {c.patient_phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone size={10} /> {c.patient_phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.status === "waiting" ? "warning" : c.status === "in_treatment" ? "info" : "success"}>
                    {STATUS_LABELS[c.status]}
                  </Badge>
                  <div className="flex gap-1">
                    {c.status === "waiting" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "in_treatment")}>Start</Button>
                    )}
                    {c.status === "in_treatment" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "stabilized")}>Stable</Button>
                        <Button size="sm" onClick={() => updateStatus(c.id, "discharged")}>Discharge</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onOpenChange={() => setShowForm(false)} title="Register Emergency Case">
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Patient Name" placeholder="Full name" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} required />
            <Input label="Phone" placeholder="Phone number" value={form.patient_phone} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} />
            <Input label="Age" type="number" placeholder="Age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            <div>
              <label className="text-xs font-medium mb-1 block">Gender</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <Input label="Chief Complaint" placeholder="e.g. Chest pain, Road accident..." value={form.chief_complaint} onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })} required />

          <div>
            <label className="text-xs font-medium mb-1 block">Triage Level</label>
            <div className="grid grid-cols-4 gap-2">
              {(["critical", "urgent", "non_urgent", "stable"] as const).map((level) => (
                <button key={level} type="button"
                  onClick={() => setForm({ ...form, triage_level: level })}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                    form.triage_level === level
                      ? TRIAGE_COLORS[level]
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {level.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <Input label="Notes" placeholder="Initial observations..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? "Registering..." : "Register"}</Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
