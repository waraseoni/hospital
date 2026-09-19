"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils/formatters";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from("audit_logs").select("*, user:profiles(full_name)").order("created_at", { ascending: false }).limit(100);
      setLogs(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">System Audit Logs</h1>
      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading audit logs...</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Table</th>
                <th className="px-4 py-3 text-left font-medium">Record ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id as string} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(log.created_at as string)}</td>
                  <td className="px-4 py-3">{(log.user as Record<string, unknown>)?.full_name as string || "System"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${log.action === "DELETE" ? "bg-red-100 text-red-800" : log.action === "INSERT" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                      {log.action as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{log.table_name as string}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{(log.record_id as string)?.slice(0, 8)}...</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No audit logs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
