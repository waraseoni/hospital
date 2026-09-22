"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Syringe, Plus, Search, UserRound, Calendar } from "lucide-react";

interface Vaccination {
  id: string;
  patient_id: string;
  vaccine_name: string;
  dose_number: number;
  administered_date: string;
  next_due_date: string | null;
  notes: string;
  patient?: { name: string; uhid: string };
  administered_by?: { full_name: string };
}

const COMMON_VACCINES = [
  "COVID-19", "Influenza", "Hepatitis B", "TT (Tetanus)", "Typhoid",
  "MMR", "DPT", "Chicken Pox", "Pneumococcal", "HPV",
];

export default function VaccinationsPage() {
  const { t } = useI18n();
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [patient, setPatient] = useState<{ id: string; name: string; uhid: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; uhid: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({
    vaccine_name: "", dose_number: "1", batch_number: "",
    administered_date: new Date().toISOString().split("T")[0],
    next_due_date: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadVaccinations(); }, []);

  async function loadVaccinations() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("vaccinations")
      .select("*, patient:patients(name, uhid), administered_by:profiles(full_name)")
      .order("administered_date", { ascending: false });
    setVaccinations((data as unknown as Vaccination[]) || []);
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

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!patient || !form.vaccine_name) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("vaccinations").insert({
      patient_id: patient.id,
      administered_by: user.id,
      vaccine_name: form.vaccine_name,
      dose_number: parseInt(form.dose_number) || 1,
      batch_number: form.batch_number,
      administered_date: form.administered_date,
      next_due_date: form.next_due_date || null,
      notes: form.notes,
    });

    if (!error) {
      addToast("success", "Vaccination recorded");
      setShowForm(false);
      setPatient(null);
      setForm({ vaccine_name: "", dose_number: "1", batch_number: "", administered_date: new Date().toISOString().split("T")[0], next_due_date: "", notes: "" });
      loadVaccinations();
    } else {
      addToast("error", "Failed to record");
    }
    setSaving(false);
  }

  const today = new Date().toISOString().split("T")[0];
  const dueSoon = vaccinations.filter((v) => v.next_due_date && v.next_due_date >= today && v.next_due_date <= new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title="Vaccination Records"
        subtitle="Record and track patient vaccinations"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Record Vaccination
          </Button>
        }
      />

      {dueSoon.length > 0 && (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <p className="text-sm font-medium text-orange-700 mb-1">⚠️ Due in next 30 days</p>
          {dueSoon.map((v) => (
            <p key={v.id} className="text-xs text-orange-600">
              {v.patient?.name} — {v.vaccine_name} Dose {v.dose_number} (Due: {v.next_due_date})
            </p>
          ))}
        </div>
      )}

      {vaccinations.length === 0 ? (
        <EmptyState title="No vaccinations recorded" description="Record the first vaccination" />
      ) : (
        <div className="space-y-2">
          {vaccinations.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Syringe size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{v.patient?.name}</p>
                    <Badge variant="outline">{v.vaccine_name}</Badge>
                    <Badge variant="muted">Dose {v.dose_number}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Given: {v.administered_date}
                    {v.next_due_date && ` | Next due: ${v.next_due_date}`}
                    {v.administered_by && ` | By: ${v.administered_by.full_name}`}
                  </p>
                </div>
              </div>
              {v.next_due_date && v.next_due_date >= today && (
                <Badge variant="warning">Due</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onOpenChange={() => setShowForm(false)} title="Record Vaccination">
        <form onSubmit={handleRecord} className="space-y-3">
          {!patient ? (
            <div>
              <label className="text-xs font-medium mb-1 block">Patient</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search by name or UHID..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} />
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-40 overflow-y-auto">
                    {searchResults.map((p) => (
                      <button key={p.id} type="button"
                        onClick={() => { setPatient(p); setSearchQuery(""); setSearchResults([]); }}
                        className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted text-left">
                        {p.name} ({p.uhid})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 p-2.5">
              <div className="flex items-center gap-2">
                <UserRound size={15} className="text-primary" />
                <span className="text-sm font-medium">{patient.name}</span>
                <span className="text-xs text-muted-foreground">({patient.uhid})</span>
              </div>
              <button type="button" onClick={() => setPatient(null)} className="text-xs text-muted-foreground hover:text-foreground">
                Change
              </button>
            </div>
          )}

          <div>
            <label className="text-xs font-medium mb-1 block">Vaccine</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_VACCINES.map((v) => (
                <button key={v} type="button"
                  onClick={() => setForm({ ...form, vaccine_name: v })}
                  className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                    form.vaccine_name === v
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Input placeholder="Or type vaccine name..." value={form.vaccine_name}
              onChange={(e) => setForm({ ...form, vaccine_name: e.target.value })} required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input label="Dose No." type="number" min="1" value={form.dose_number}
              onChange={(e) => setForm({ ...form, dose_number: e.target.value })} />
            <Input label="Batch No." placeholder="Optional" value={form.batch_number}
              onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
            <Input label="Admin Date" type="date" value={form.administered_date}
              onChange={(e) => setForm({ ...form, administered_date: e.target.value })} />
          </div>

          <Input label="Next Due Date (optional)" type="date" value={form.next_due_date}
            onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />

          <Input label="Notes" placeholder="Optional notes..." value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={saving || !patient || !form.vaccine_name}>
              {saving ? "Recording..." : "Record"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
