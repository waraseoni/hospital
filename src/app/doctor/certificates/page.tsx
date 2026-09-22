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
import { FileText, Plus, Download, UserRound, Search } from "lucide-react";

interface Certificate {
  id: string;
  patient_id: string;
  doctor_id: string;
  certificate_type: string;
  diagnosis: string;
  content: string;
  from_date: string | null;
  to_date: string | null;
  pdf_url: string | null;
  created_at: string;
  patient?: { name: string; uhid: string };
}

const TYPES = [
  { id: "fitness", label: "Fitness Certificate" },
  { id: "sick_leave", label: "Sick Leave" },
  { id: "discharge", label: "Discharge Summary" },
  { id: "referral", label: "Referral Letter" },
];

export default function CertificatesPage() {
  const { t } = useI18n();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [patient, setPatient] = useState<{ id: string; name: string; uhid: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; uhid: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({
    certificate_type: "fitness",
    diagnosis: "",
    content: "",
    from_date: "",
    to_date: "",
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadCerts(); }, []);

  async function loadCerts() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("medical_certificates")
      .select("*, patient:patients(name, uhid)")
      .eq("doctor_id", user.id)
      .order("created_at", { ascending: false });
    setCerts((data as unknown as Certificate[]) || []);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!patient) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const defaultContent = form.content || getDefaultContent(form.certificate_type, patient.name);

    const { data: cert, error } = await supabase.from("medical_certificates").insert({
      patient_id: patient.id,
      doctor_id: user.id,
      certificate_type: form.certificate_type,
      diagnosis: form.diagnosis,
      content: defaultContent,
      from_date: form.from_date || null,
      to_date: form.to_date || null,
    }).select("id").single();

    if (!error && cert) {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificate_id: cert.id }),
      });
      const result = await res.json();
      if (result.pdf_url) {
        window.open(result.pdf_url, "_blank");
      }
      addToast("success", "Certificate generated");
      setShowForm(false);
      resetForm();
      loadCerts();
    } else {
      addToast("error", "Failed to create");
    }
    setSaving(false);
  }

  function getDefaultContent(type: string, name: string): string {
    switch (type) {
      case "fitness":
        return `This is to certify that ${name} was examined and found to be medically fit for work/activities as of the date of this certificate.`;
      case "sick_leave":
        return `This is to certify that ${name} is under my medical care and has been advised sick leave for the period mentioned above.`;
      case "discharge":
        return `Patient ${name} was admitted and has been discharged after treatment. The patient is stable at the time of discharge.`;
      case "referral":
        return `This letter refers ${name} for further evaluation and management.`;
      default:
        return `This is a medical certificate issued for ${name}.`;
    }
  }

  function resetForm() {
    setPatient(null);
    setForm({ certificate_type: "fitness", diagnosis: "", content: "", from_date: "", to_date: "" });
    setSearchQuery("");
  }

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title="Medical Certificates"
        subtitle="Generate and manage patient certificates"
        actions={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Certificate
          </Button>
        }
      />

      {certs.length === 0 ? (
        <EmptyState title="No certificates yet" description="Create your first certificate" />
      ) : (
        <div className="space-y-2">
          {certs.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{c.patient?.name}</p>
                    <Badge variant="outline">{TYPES.find((tp) => tp.id === c.certificate_type)?.label || c.certificate_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.diagnosis || "—"} | {new Date(c.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {c.pdf_url && (
                  <a href={c.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
                    <Download size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onOpenChange={() => setShowForm(false)} title="New Medical Certificate">
        <form onSubmit={handleCreate} className="space-y-3">
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
            <label className="text-xs font-medium mb-1 block">Certificate Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((tp) => (
                <button key={tp.id} type="button"
                  onClick={() => setForm({ ...form, certificate_type: tp.id })}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    form.certificate_type === tp.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {tp.label}
                </button>
              ))}
            </div>
          </div>

          <Input label="Diagnosis" placeholder="Primary diagnosis" value={form.diagnosis}
            onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />

          {(form.certificate_type === "sick_leave") && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="From Date" type="date" value={form.from_date} onChange={(e) => setForm({ ...form, from_date: e.target.value })} />
              <Input label="To Date" type="date" value={form.to_date} onChange={(e) => setForm({ ...form, to_date: e.target.value })} />
            </div>
          )}

          <Input label="Content (optional — auto-filled if empty)" placeholder="Certificate content..." value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={saving || !patient}>
              {saving ? "Generating..." : "Generate PDF"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
