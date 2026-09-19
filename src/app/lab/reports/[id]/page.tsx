"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";

export default function LabReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [testData, setTestData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("lab_reports").select("*, patient:patients(name, uhid)").eq("id", reportId).single();
      if (data) {
        setReport(data);
        setTestData((data.test_data as Record<string, string>) || {});
      }
      setLoading(false);
    }
    load();
  }, [reportId]);

  function addParameter() {
    setTestData({ ...testData, "": "" });
  }

  async function handleSave(status: "in_progress" | "finalized") {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("lab_reports").update({
      test_data: testData,
      status,
      finalized_at: status === "finalized" ? new Date().toISOString() : null,
    }).eq("id", reportId);
    setSaving(false);
    if (status === "finalized") router.push("/lab/queue");
  }

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading report...</div>;
  if (!report) return <div className="text-destructive">Report not found</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">{report.test_name as string}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Patient: {(report.patient as Record<string, unknown>)?.name as string} | UHID: {(report.patient as Record<string, unknown>)?.uhid as string}
      </p>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Test Parameters</h2>
          <button onClick={addParameter} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20">
            + Add Parameter
          </button>
        </div>

        {Object.entries(testData).map(([key, value], i) => (
          <div key={i} className="grid grid-cols-2 gap-3">
            <input
              placeholder="Parameter name"
              value={key}
              onChange={(e) => {
                const newKey = e.target.value;
                const { [key]: _, ...rest } = testData;
                const entries = Object.entries(rest);
                entries.splice(Object.keys(testData).indexOf(key), 0, [newKey, value]);
                setTestData(Object.fromEntries(entries));
              }}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                placeholder="Result value"
                value={value}
                onChange={(e) => setTestData({ ...testData, [key]: e.target.value })}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <button onClick={() => { const { [key]: _, ...rest } = testData; setTestData(rest); }} className="rounded-lg border border-border px-2 text-destructive hover:bg-destructive/10 text-sm">&times;</button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={() => handleSave("in_progress")} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
          Save Draft
        </button>
        <button onClick={() => handleSave("finalized")} disabled={saving} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
          {saving ? "Saving..." : "Finalize Report"}
        </button>
      </div>
    </div>
  );
}
