"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page";
import Link from "next/link";

export default function DoctorPatientsListPage() {
  const { t } = useI18n();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { addToast } = useToast();

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("name");
    setPatients(data || []);
    setLoading(false);
  }

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.uhid.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  return (
    <div>
      <PageHeader title={t("doctorPatients.title")} />
      <div className="mb-4 max-w-md"><SearchBar value={search} onChange={setSearch} placeholder={t("doctorPatients.searchPlaceholder")} /></div>
      {loading ? <Skeleton lines={5} /> : filtered.length === 0 ? (
        <EmptyState title={t("doctorPatients.noPatients")} description={t("ui.noData")} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("doctorPatients.uhid")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("doctorPatients.name")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("doctorPatients.phone")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("doctorPatients.action")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{p.uhid}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                  <td className="px-4 py-3"><Link href={`/doctor/patients/${p.id}`} className="text-primary text-xs hover:underline">{t("doctorPatients.viewHistory")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
