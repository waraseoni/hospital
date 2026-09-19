"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient } from "@/types/database";
import Link from "next/link";
import { useI18n } from "@/i18n/provider";

export default function DoctorPatientsListPage() {
  const { t } = useI18n();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadPatients() {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("name");
    setPatients(data || []);
    setLoading(false);
  }

  useEffect(() => { loadPatients(); }, []);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.uhid.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("doctorPatients.title")}</h1>
      <input
        placeholder={t("doctorPatients.searchPlaceholder")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
                  <td className="px-4 py-3">
                    <Link href={`/doctor/patients/${p.id}`} className="text-primary text-xs hover:underline">
                      {t("doctorPatients.viewHistory")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
