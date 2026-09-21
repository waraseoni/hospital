"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { UserRound, Search, FileText, Plus } from "lucide-react";

interface ProgressNote {
  id: string;
  patient_id: string;
  doctor_id: string;
  note_type: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  vitals_snapshot: Record<string, unknown>;
  created_at: string;
  patient?: { name: string; uhid: string };
  doctor?: { full_name: string };
}

function NotesContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patient");

  const [patient, setPatient] = useState<{ id: string; name: string; uhid: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; uhid: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subjective: "", objective: "", assessment: "", plan: "", note_type: "opd" });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (patientIdParam) {
      loadPatient(patientIdParam);
    }
  }, [patientIdParam]);

  async function loadPatient(id: string) {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("id, name, uhid").eq("id", id).single();
    if (data) {
      setPatient(data);
      loadNotes(id);
    }
  }

  async function loadNotes(patientId: string) {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("progress_notes")
      .select("*, doctor:profiles(full_name)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });
    setNotes((data as ProgressNote[]) || []);
    setLoading(false);
  }

  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("id, name, uhid").or(`name.ilike.%${query}%,uhid.ilike.%${query}%`).limit(10);
    setSearchResults((data as { id: string; name: string; uhid: string }[]) || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { if (searchQuery) searchPatients(searchQuery); }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchPatients]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("progress_notes").insert({
      patient_id: patient.id,
      doctor_id: user.id,
      note_type: form.note_type,
      subjective: form.subjective,
      objective: form.objective,
      assessment: form.assessment,
      plan: form.plan,
    });

    if (!error) {
      addToast("success", "Note saved");
      setShowForm(false);
      setForm({ subjective: "", objective: "", assessment: "", plan: "", note_type: "opd" });
      loadNotes(patient.id);
    } else {
      addToast("error", "Failed to save");
    }
    setSaving(false);
  }

  return (
    <PageContainer>
      <PageHeader title="Progress Notes" subtitle="SOAP notes for patient encounters" />

      {!patient ? (
        <div className="max-w-lg rounded-xl border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserRound size={16} className="text-primary" />
            Select Patient
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or UHID..."
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm"
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <div className="rounded-lg border bg-background max-h-60 overflow-y-auto">
              {searchResults.map((p) => (
                <button key={p.id} type="button" onClick={() => { setPatient(p); setSearchQuery(""); setSearchResults([]); loadNotes(p.id); }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-muted border-b last:border-0">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">UHID: {p.uhid}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound size={20} />
              </div>
              <div>
                <p className="font-semibold">{patient.name}</p>
                <p className="text-xs text-muted-foreground">UHID: {patient.uhid}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setPatient(null); setNotes([]); }}>Change Patient</Button>
              <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-3.5 w-3.5 mr-1" /> New Note</Button>
            </div>
          </div>

          {showForm && (
            <form onSubmit={handleSave} className="rounded-xl border bg-card p-5 space-y-4 mb-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">New SOAP Note</h3>
                <select value={form.note_type} onChange={(e) => setForm({ ...form, note_type: e.target.value })}
                  className="rounded-md border bg-background px-3 py-1.5 text-xs">
                  <option value="opd">OPD</option>
                  <option value="ipd">IPD</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Subjective (S)</label>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={2} placeholder="Patient's chief complaint, symptoms..."
                  value={form.subjective} onChange={(e) => setForm({ ...form, subjective: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Objective (O)</label>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={2} placeholder="Vitals, examination findings..."
                  value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Assessment (A)</label>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={2} placeholder="Diagnosis, differential..."
                  value={form.assessment} onChange={(e) => setForm({ ...form, assessment: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Plan (P)</label>
                <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={2} placeholder="Treatment plan, medications, follow-up..."
                  value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Saving..." : t("common.save")}</Button>
              </div>
            </form>
          )}

          {loading ? <Skeleton lines={4} /> : notes.length === 0 ? (
            <EmptyState title="No progress notes" description="Create a SOAP note for this patient" />
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-muted-foreground" />
                      <Badge variant={note.note_type === "ipd" ? "info" : note.note_type === "emergency" ? "warning" : "outline"}>
                        {note.note_type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Dr. {note.doctor?.full_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {note.subjective && <div><span className="text-xs font-semibold text-muted-foreground">S:</span> {note.subjective}</div>}
                    {note.objective && <div><span className="text-xs font-semibold text-muted-foreground">O:</span> {note.objective}</div>}
                    {note.assessment && <div><span className="text-xs font-semibold text-muted-foreground">A:</span> {note.assessment}</div>}
                    {note.plan && <div><span className="text-xs font-semibold text-muted-foreground">P:</span> {note.plan}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

export default function DoctorNotesPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-muted-foreground">Loading...</div>}>
      <NotesContent />
    </Suspense>
  );
}
