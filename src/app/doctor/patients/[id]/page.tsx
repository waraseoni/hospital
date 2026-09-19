"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";

interface Prescription {
  id: string;
  created_at: string;
  diagnosis: string;
  pdf_url: string | null;
  doctor: { full_name: string } | null;
}

interface LabReport {
  id: string;
  created_at: string;
  test_name: string;
  status: string;
  pdf_url: string | null;
  ordered_by: { full_name: string } | null;
}

export default function PatientHistoryPage() {
  const params = useParams();
  const patientId = params.id as string;
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [prescs, reports] = await Promise.all([
        supabase.from("prescriptions").select("*, doctor:profiles(full_name)").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(20),
        supabase.from("lab_reports").select("*, ordered_by:profiles(full_name)").eq("patient_id", patientId).order("created_at", { ascending: false }).limit(20),
      ]);
      setPrescriptions((prescs.data as Prescription[]) || []);
      setLabReports((reports.data as LabReport[]) || []);
      setLoading(false);
    }
    load();
  }, [patientId]);

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading patient history...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Patient EMR History</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Prescriptions</h2>
          {prescriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No prescriptions found</p>
          ) : (
            <div className="space-y-3">
              {prescriptions.map((p) => (
                <div key={p.id} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                  <p className="font-medium mt-1">{p.diagnosis}</p>
                  <p className="text-xs text-muted-foreground">Dr. {p.doctor?.full_name}</p>
                  {p.pdf_url && (
                    <a href={p.pdf_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline mt-1 inline-block">
                      View PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold mb-4">Lab Reports</h2>
          {labReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lab reports found</p>
          ) : (
            <div className="space-y-3">
              {labReports.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{r.test_name}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "finalized" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  {r.pdf_url && (
                    <a href={r.pdf_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline mt-1 inline-block">
                      View Report PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
