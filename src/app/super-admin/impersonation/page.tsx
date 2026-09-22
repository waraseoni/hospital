"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { SearchBar } from "@/components/ui/search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatDuration } from "@/lib/utils/formatters";

interface ImpSession {
  sid: string;
  actor: string;
  targetRole: string;
  targetName: string;
  reason: string;
  startedAt: string;
  endedAt: string | null;
}

interface AuditRow {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  user: { full_name: string | null } | null;
}

function fillSession(
  sessions: ImpSession[],
  row: AuditRow,
  actorName: string
) {
  const sid = (row.new_data?.sid as string) || "";
  if (!sid) return;
  if (row.action === "IMPERSONATE_START") {
    sessions.push({
      sid,
      actor: actorName,
      targetRole: (row.new_data?.target_role as string) || "",
      targetName: (row.new_data?.target_name as string) || "",
      reason: (row.new_data?.reason as string) || "",
      startedAt: row.created_at,
      endedAt: null,
    });
  } else if (row.action === "IMPERSONATE_END") {
    const found = sessions.find((s) => s.sid === sid);
    if (found) found.endedAt = row.created_at;
  }
}

export default function SuperAdminImpersonationPage() {
  const [sessions, setSessions] = useState<ImpSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, table_name, record_id, new_data, created_at, user:profiles(full_name)")
        .in("action", ["IMPERSONATE_START", "IMPERSONATE_END"])
        .order("created_at", { ascending: false })
        .limit(500);
      const acc: ImpSession[] = [];
      for (const row of ((data || []) as unknown) as AuditRow[]) {
        fillSession(acc, row, (row.user as { full_name: string | null } | null)?.full_name || "System");
      }
      setSessions(acc.sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = sessions.filter((s) =>
    !search ||
    s.actor.toLowerCase().includes(search.toLowerCase()) ||
    s.targetName.toLowerCase().includes(search.toLowerCase()) ||
    s.targetRole.toLowerCase().includes(search.toLowerCase()) ||
    s.reason.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageContainer>
      <PageHeader title="Impersonation History" subtitle="Who impersonated whom, when, and why (correlated by session id)" />

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by actor, target, role, or reason..." />
      </div>

      {loading ? <Skeleton lines={5} /> : filtered.length === 0 ? (
        <EmptyState title="No impersonation sessions" description="Impersonation start/end events will appear here." />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Actor</th>
                <th className="px-4 py-3 text-left font-medium">Target</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Reason</th>
                <th className="px-4 py-3 text-left font-medium">Started</th>
                <th className="px-4 py-3 text-left font-medium">Ended</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.sid} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{s.actor}</td>
                  <td className="px-4 py-3">{s.targetName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 capitalize dark:bg-amber-900/40 dark:text-amber-300">
                      {s.targetRole}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.reason || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(s.startedAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.endedAt ? formatDateTime(s.endedAt) : (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-300">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.endedAt ? formatDuration(new Date(s.startedAt).getTime(), new Date(s.endedAt).getTime()) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}