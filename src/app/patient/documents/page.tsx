"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PatientDocument } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Upload, FileText, Trash2, Download } from "lucide-react";

export default function PatientDocumentsPage() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<(PatientDocument & { signed_url?: string })[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("scan");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
    if (patient) {
      const { data } = await supabase.from("patient_documents").select("*")
        .eq("patient_id", patient.id).order("created_at", { ascending: false });
      const rows = (data as PatientDocument[]) || [];
      const withUrls = await Promise.all(rows.map(async (d) => {
        const path = d.file_url;
        if (!path.startsWith("patient_documents/")) return { ...d };
        const { data: urlData } = await supabase.storage.from("scans").createSignedUrl(path, 3600);
        return { ...d, signed_url: urlData?.signedUrl };
      }));
      setDocs(withUrls);
    }
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) {
      addToast("error", t("common.notFound") ? "Please add a title and choose a file" : "Missing title/name");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }
    const { data: patient } = await supabase.from("patients").select("id").eq("user_id", user.id).single();
    if (!patient) { setUploading(false); addToast("error", "Patient record not found"); return; }

    const ext = file.name.split(".").pop() || "bin";
    const path = `patient_documents/${patient.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("scans").upload(path, file, { upsert: false });
    if (upErr) {
      addToast("error", upErr.message);
      setUploading(false);
      return;
    }
    const { error } = await supabase.from("patient_documents").insert({
      patient_id: patient.id,
      title: title.trim(),
      category,
      file_url: path,
      uploaded_by: user.id,
    });
    if (!error) {
      addToast("success", t("patientDocs.uploadSuccess") || "Uploaded");
      setTitle("");
      setFile(null);
      load();
    } else {
      addToast("error", error.message);
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("patientDocs.deleteConfirm") || "Delete this document?")) return;
    const supabase = createClient();
    await supabase.from("patient_documents").delete().eq("id", id);
    addToast("success", t("patientDocs.deleteSuccess") || "Deleted");
    load();
  }

  const categoryLabel = (c: string) => {
    const labels: Record<string, string> = {
      prescription: t("patientDocs.prescription"),
      lab_report: t("patientDocs.lab_report"),
      invoice: t("patientDocs.invoice"),
      scan: t("patientDocs.scan"),
      other: t("patientDocs.other"),
    };
    return labels[c] || c;
  };

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("patientDocs.title")} subtitle={t("patientDocs.subtitle")} />

      <form onSubmit={handleUpload} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label={t("patientDocs.titlePlaceholder")} placeholder={t("patientDocs.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Select label={t("patientDocs.category")} value={category} onChange={(e) => setCategory(e.target.value)} options={[
            { value: "scan", label: t("patientDocs.scan") },
            { value: "prescription", label: t("patientDocs.prescription") },
            { value: "lab_report", label: t("patientDocs.lab_report") },
            { value: "invoice", label: t("patientDocs.invoice") },
            { value: "other", label: t("patientDocs.other") },
          ]} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <label className="text-xs font-medium">{t("patientDocs.selectFile")}</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">{t("patientDocs.filesOnly")}</p>
          </div>
          <Button type="submit" disabled={uploading}>
            <Upload size={15} className="mr-1" />
            {uploading ? t("patientDocs.uploading") : t("patientDocs.upload")}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        {docs.length === 0 ? (
          <EmptyState title={t("patientDocs.noDocuments")} description={t("ui.noData")} />
        ) : (
          docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel(d.category)} | {t("patientDocs.uploadedOn")}: {new Date(d.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {d.signed_url && (
                  <a href={d.signed_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20">
                    <Download size={16} />
                  </a>
                )}
                <button onClick={() => handleDelete(d.id)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </PageContainer>
  );
}