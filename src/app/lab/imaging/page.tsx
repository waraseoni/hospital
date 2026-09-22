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
import { Scan, Clock, CheckCircle, PlayCircle } from "lucide-react";

interface ImagingRequest {
  id: string;
  patient_id: string;
  ordered_by: string;
  modality: string;
  body_part: string;
  clinical_indication: string;
  status: string;
  findings: string;
  impression: string;
  priority: string;
  created_at: string;
  patient?: { name: string; uhid: string };
  ordered_by_profile?: { full_name: string };
}

const MODALITY_LABELS: Record<string, string> = {
  xray: "X-Ray", mri: "MRI", ct: "CT Scan",
  ultrasound: "Ultrasound", mammography: "Mammography", other: "Other",
};

export default function LabImagingPage() {
  const { t } = useI18n();
  const [requests, setRequests] = useState<ImagingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ImagingRequest | null>(null);
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [completing, setCompleting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("imaging_requests")
      .select("*, patient:patients(name, uhid), ordered_by_profile:profiles!imaging_requests_ordered_by_fkey(full_name)")
      .order("created_at", { ascending: false });
    setRequests((data as unknown as ImagingRequest[]) || []);
    setLoading(false);
  }

  async function handleComplete() {
    if (!selected) return;
    setCompleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("imaging_requests").update({
      findings, impression, status: "completed", completed_at: new Date().toISOString(),
    }).eq("id", selected.id);
    if (!error) {
      addToast("success", "Imaging report completed");
      setSelected(null);
      setFindings("");
      setImpression("");
      loadRequests();
    } else {
      addToast("error", "Failed to update");
    }
    setCompleting(false);
  }

  async function updateStatus(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("imaging_requests").update({ status }).eq("id", id);
    loadRequests();
  }

  const ordered = requests.filter((r) => r.status === "ordered");
  const inProgress = requests.filter((r) => r.status === "in_progress");
  const completed = requests.filter((r) => r.status === "completed");

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title="Radiology / Imaging" subtitle="View and process imaging requests" />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard icon={<Clock size={18} />} label="Ordered" value={String(ordered.length)} />
        <StatCard icon={<PlayCircle size={18} />} label="In Progress" value={String(inProgress.length)} />
        <StatCard icon={<CheckCircle size={18} />} label="Completed" value={String(completed.length)} />
      </div>

      {requests.length === 0 ? (
        <EmptyState title="No imaging requests" description="No orders yet" />
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <Scan size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{r.patient?.name}</p>
                      <Badge variant="outline">{MODALITY_LABELS[r.modality] || r.modality}</Badge>
                      <Badge variant={r.priority === "stat" ? "warning" : r.priority === "urgent" ? "info" : "muted"}>
                        {r.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Part: {r.body_part} | {r.clinical_indication || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      By: Dr. {r.ordered_by_profile?.full_name || "—"} | {new Date(r.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "completed" ? "success" : r.status === "in_progress" ? "info" : "warning"}>
                    {r.status}
                  </Badge>
                  {r.status === "ordered" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "in_progress")}>Start</Button>
                  )}
                  {r.status === "in_progress" && (
                    <Button size="sm" onClick={() => { setSelected(r); setFindings(r.findings); setImpression(r.impression); }}>
                      Complete
                    </Button>
                  )}
                  {r.status === "completed" && r.findings && (
                    <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {r.findings}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!selected} onOpenChange={() => setSelected(null)} title="Complete Imaging Report">
        <div className="space-y-3">
          <div className="rounded-md bg-muted/40 p-3 text-sm">
            <p className="font-medium">{selected?.patient?.name} ({selected?.patient?.uhid})</p>
            <p className="text-xs text-muted-foreground">
              {MODALITY_LABELS[selected?.modality || ""]} | {selected?.body_part}
            </p>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Findings</label>
            <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={4}
              placeholder="Radiological findings..." value={findings} onChange={(e) => setFindings(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Impression</label>
            <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm" rows={3}
              placeholder="Impression / diagnosis..." value={impression} onChange={(e) => setImpression(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setSelected(null)}>{t("common.cancel")}</Button>
            <Button onClick={handleComplete} disabled={completing || !findings}>
              {completing ? "Saving..." : "Complete Report"}
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
