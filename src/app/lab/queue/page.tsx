"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LabReport, Patient } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import Link from "next/link";

const statusMap: Record<string, "info" | "success" | "warning" | "destructive"> = {
  pending: "warning",
  in_progress: "info",
  finalized: "success",
};

export default function LabQueuePage() {
  const { t } = useI18n();
  const [reports, setReports] = useState<LabReport[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newPatientId, setNewPatientId] = useState("");
  const [newTestName, setNewTestName] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data } = await supabase.from("lab_reports").select("*, patient:patients(name, uhid)").order("created_at", { ascending: false });
    setReports((data as LabReport[]) || []);
    const { data: pData } = await supabase.from("patients").select("*").order("name");
    setPatients((pData as Patient[]) || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newPatientId || !newTestName.trim()) return;
    setCreating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("lab_reports").insert({ patient_id: newPatientId, test_name: newTestName.trim(), test_category: "general", ordered_by: user?.id || null, status: "pending", test_data: {}, normal_ranges: {}, notes: newNotes.trim() || null });
    if (!error) { addToast("success", "Report created"); setShowForm(false); setNewPatientId(""); setNewTestName(""); setNewNotes(""); }
    else addToast("error", "Failed to create");
    setCreating(false);
    loadData();
  }

  async function handleDelete() {
    if (!deleteId) return;
    const supabase = createClient();
    await supabase.from("lab_reports").delete().eq("id", deleteId);
    addToast("success", "Deleted");
    setDeleteId(null);
    loadData();
  }

  const pending = reports.filter(r => r.status === "pending");
  const inProgress = reports.filter(r => r.status === "in_progress");
  const finalized = reports.filter(r => r.status === "finalized");

  return (
    <div>
      <PageHeader title={t("labQueue.title")} actions={<Button onClick={() => setShowForm(!showForm)}>{showForm ? t("labQueue.cancel") : t("labQueue.newReport")}</Button>} />
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">{t("labQueue.createReport")}</h2>
          <Select value={newPatientId} onChange={(e) => setNewPatientId(e.target.value)} options={[{ value: "", label: t("labQueue.selectPatient") }, ...patients.map(p => ({ value: p.id, label: `${p.name} (${p.uhid})` }))]} />
          <Input placeholder={t("labQueue.testName")} value={newTestName} onChange={(e) => setNewTestName(e.target.value)} required />
          <Input placeholder={t("labQueue.notes")} value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
          <Button type="submit" disabled={creating}>{creating ? t("labQueue.creating") : t("labQueue.createReportBtn")}</Button>
        </form>
      )}
      {loading ? <Skeleton lines={5} /> : (
        <div className="space-y-6">
          {[
            { key: "pending", label: t("labQueue.pending"), count: pending.length, color: "text-orange-600", reports: pending, status: "warning" },
            { key: "inProgress", label: t("labQueue.inProgress"), count: inProgress.length, color: "text-blue-600", reports: inProgress, status: "info" },
            { key: "finalized", label: t("labQueue.finalized"), count: finalized.length, color: "text-green-600", reports: finalized, status: "success" },
          ].map(({ key, label, count, color, reports: sectionReports, status }) => (
            <section key={key}>
              <h2 className={`text-lg font-semibold mb-3 ${color}`}>{label.replace("{count}", String(count))}</h2>
              <div className="space-y-2">
                {sectionReports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                    <div><p className="font-medium">{r.test_name}</p><p className="text-xs text-muted-foreground">{r.patient?.name} | UHID: {r.patient?.uhid}</p></div>
                    <div className="flex items-center gap-2">
                      {(r.status === "pending" || r.status === "in_progress") && <Link href={`/lab/reports/${r.id}`}><Button size="sm">{r.status === "pending" ? t("labQueue.enterResults") : t("labQueue.completeReport")}</Button></Link>}
                      {r.status === "finalized" && r.pdf_url && <a href={r.pdf_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">{t("labQueue.viewPdf")}</a>}
                      {r.status === "pending" && <button onClick={() => setDeleteId(r.id)} className="rounded-lg border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">{t("common.delete")}</button>}
                    </div>
                  </div>
                ))}
                {sectionReports.length === 0 && <EmptyState title={t("labQueue.noPending")} description={t("ui.noData")} />}
              </div>
            </section>
          ))}
        </div>
      )}
      <Modal open={!!deleteId} onOpenChange={() => setDeleteId(null)} title={t("labQueue.deleteConfirm")} footer={
        <>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleDelete}>{t("common.delete")}</Button>
        </>
      }>
        <p>{t("labQueue.deleteConfirmMsg") || t("labQueue.deleteConfirm")}</p>
      </Modal>
    </div>
  );
}
