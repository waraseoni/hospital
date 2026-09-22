"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { DatePicker } from "@/components/ui/date-picker";
import { Download, IndianRupee, Users, Package, ClipboardList } from "lucide-react";

type Tab = "revenue" | "doctor" | "inventory" | "mis";

interface RevenueSummary {
  total_billed: number;
  total_collected: number;
  total_discount: number;
  total_tax: number;
  invoice_count: number;
  by_category: Record<string, number>;
  payment_methods: Record<string, number>;
}

interface DailyPoint {
  date: string;
  billed?: number;
  collected?: number;
  invoices?: number;
  admissions?: number;
  discharges?: number;
}

interface DoctorRow {
  doctor_id: string;
  doctor_name: string;
  specialization: string;
  invoice_count: number;
  total_billed: number;
}

interface InventorySummary {
  total_items: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  expiring_count: number;
  by_category: Record<string, { items: number; value: number }>;
}

interface StockRow {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minimum_stock: number;
  price_per_unit: number;
  expiry_date: string | null;
  batch_number: string | null;
}

interface MisSummary {
  admissions: number;
  discharges: number;
  active_census: number;
  avg_stay_days: number;
  appointments: number;
  completed_appointments: number;
  appointments_today: number;
  beds_total: number;
  beds_occupied: number;
  lab_pending: number;
}

function fmtMoney(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (!data.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-0.5 overflow-x-auto" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="group relative flex min-w-[6px] flex-1 flex-col items-center justify-end"
            style={{ height }}
            title={`${d.label}: ${fmtMoney(d.value)}`}
          >
            <div
              className="w-full rounded-t bg-primary/70 transition-all group-hover:bg-primary"
              style={{ height: `${Math.max((d.value / max) * (height - 4), d.value > 0 ? 4 : 0)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-0.5 overflow-x-auto text-[9px] text-muted-foreground">
        {data.map((d, i) => (
          <div key={i} className="min-w-[6px] flex-1 truncate text-center" title={d.label}>
            {i % Math.ceil(data.length / 8 || 1) === 0 ? d.label.slice(5) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function HBarList({ items, format = fmtMoney }: { items: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (!items.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{it.label}</span>
            <span className="text-muted-foreground">{format(it.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminReportsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("revenue");
  const [from, setFrom] = useState(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revenue, setRevenue] = useState<{ summary: RevenueSummary; daily: DailyPoint[] } | null>(null);
  const [doctors, setDoctors] = useState<{ doctors: DoctorRow[]; summary: { total_billed: number; doctor_count: number; invoice_count: number } } | null>(null);
  const [inventory, setInventory] = useState<{ summary: InventorySummary; low_stock: StockRow[]; expiring: StockRow[] } | null>(null);
  const [mis, setMis] = useState<{ summary: MisSummary; daily: DailyPoint[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = `from=${from}&to=${to}`;
      const [rev, doc, inv, m] = await Promise.all([
        fetch(`/api/reports?type=revenue&${qs}`).then((r) => r.json()),
        fetch(`/api/reports?type=doctor&${qs}`).then((r) => r.json()),
        fetch(`/api/reports?type=inventory&${qs}`).then((r) => r.json()),
        fetch(`/api/reports?type=mis&${qs}`).then((r) => r.json()),
      ]);
      if (rev.error || doc.error || inv.error || m.error) {
        setError(rev.error || doc.error || inv.error || m.error);
      } else {
        setRevenue(rev);
        setDoctors(doc);
        setInventory(inv);
        setMis(m);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function handleExport() {
    const stamp = `${from}_${to}`;
    if (tab === "revenue" && revenue) {
      const catRows = Object.entries(revenue.summary.by_category).map(([category, amount]) => ({ category, amount }));
      const dailyRows = revenue.daily.map((d) => ({ date: d.date, billed: d.billed, collected: d.collected, invoices: d.invoices }));
      downloadCsv(`revenue-${stamp}.csv`, toCSV(dailyRows.length ? dailyRows : catRows));
    } else if (tab === "doctor" && doctors) {
      downloadCsv(`doctor-collections-${stamp}.csv`, toCSV(doctors.doctors as unknown as Record<string, unknown>[]));
    } else if (tab === "inventory" && inventory) {
      const rows = [
        ...inventory.low_stock.map((i) => ({ kind: "low_stock", ...i })),
        ...inventory.expiring.map((i) => ({ kind: "expiring", ...i })),
      ];
      downloadCsv(`inventory-alerts-${stamp}.csv`, toCSV(rows.length ? rows : [{ kind: "none" }]));
    } else if (tab === "mis" && mis) {
      downloadCsv(`mis-${stamp}.csv`, toCSV(mis.daily as unknown as Record<string, unknown>[]));
    }
  }

  const tabs: { id: Tab; label: string }[] = useMemo(
    () => [
      { id: "revenue", label: t("adminReports.revenue") },
      { id: "doctor", label: t("adminReports.doctorTab") },
      { id: "inventory", label: t("adminReports.inventory") },
      { id: "mis", label: t("adminReports.mis") },
    ],
    [t]
  );

  const categoryItems = revenue
    ? Object.entries(revenue.summary.by_category).map(([label, value]) => ({
        label: t(`adminReports.cat_${label}` as "adminReports.cat_opd"),
        value,
      }))
    : [];

  const methodItems = revenue
    ? Object.entries(revenue.summary.payment_methods).map(([label, value]) => ({ label: label.toUpperCase(), value }))
    : [];

  const invCategoryItems = inventory
    ? Object.entries(inventory.summary.by_category)
        .map(([label, v]) => ({ label, value: v.value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    : [];

  return (
    <PageContainer>
      <PageHeader
        title={t("adminReports.title")}
        subtitle={t("adminReports.subtitle")}
        actions={
          <Button variant="outline" onClick={handleExport} disabled={loading}>
            <Download size={14} className="mr-1" />
            {t("adminReports.exportCsv")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
        <DatePicker value={from} onChange={setFrom} label={t("adminReports.from")} className="w-40" />
        <DatePicker value={to} onChange={setTo} label={t("adminReports.to")} className="w-40" />
        <Button size="sm" onClick={load} loading={loading}>
          {t("adminReports.apply")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === tb.id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      {loading ? (
        <Skeleton lines={8} />
      ) : (
        <>
          {tab === "revenue" && revenue && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<IndianRupee size={20} />} label={t("adminReports.totalBilled")} value={fmtMoney(revenue.summary.total_billed)} />
                <StatCard icon={<IndianRupee size={20} />} label={t("adminReports.totalCollected")} value={fmtMoney(revenue.summary.total_collected)} />
                <StatCard icon={<ClipboardList size={20} />} label={t("adminReports.invoiceCount")} value={revenue.summary.invoice_count} />
                <StatCard icon={<IndianRupee size={20} />} label={t("adminReports.discount")} value={fmtMoney(revenue.summary.total_discount)} />
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">{t("adminReports.dailyTrend")}</h3>
                <BarChart
                  data={revenue.daily.map((d) => ({ label: d.date, value: d.billed || 0 }))}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold">{t("adminReports.byCategory")}</h3>
                  <HBarList items={categoryItems} />
                </div>
                <div className="rounded-xl border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold">{t("adminReports.paymentMethods")}</h3>
                  <HBarList items={methodItems} />
                </div>
              </div>
            </div>
          )}

          {tab === "doctor" && doctors && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard icon={<IndianRupee size={20} />} label={t("adminReports.totalBilled")} value={fmtMoney(doctors.summary.total_billed)} />
                <StatCard icon={<Users size={20} />} label={t("adminReports.doctorCount")} value={doctors.summary.doctor_count} />
                <StatCard icon={<ClipboardList size={20} />} label={t("adminReports.invoiceCount")} value={doctors.summary.invoice_count} />
              </div>

              {doctors.doctors.length === 0 ? (
                <EmptyState title={t("adminReports.noData")} description={t("ui.noData")} />
              ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">{t("adminReports.doctorName")}</th>
                        <th className="px-4 py-3 text-left font-medium">{t("adminReports.specialization")}</th>
                        <th className="px-4 py-3 text-left font-medium">{t("adminReports.invoiceCount")}</th>
                        <th className="px-4 py-3 text-left font-medium">{t("adminReports.totalBilled")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.doctors.map((d) => (
                        <tr key={d.doctor_id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium">{d.doctor_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{d.specialization || "—"}</td>
                          <td className="px-4 py-3">{d.invoice_count}</td>
                          <td className="px-4 py-3">{fmtMoney(d.total_billed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">{t("adminReports.collectionsChart")}</h3>
                <BarChart
                  data={doctors.doctors.slice(0, 12).map((d) => ({ label: d.doctor_name, value: d.total_billed }))}
                  height={120}
                />
              </div>
            </div>
          )}

          {tab === "inventory" && inventory && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<Package size={20} />} label={t("adminReports.stockValue")} value={fmtMoney(inventory.summary.total_value)} />
                <StatCard icon={<Package size={20} />} label={t("adminReports.totalItems")} value={inventory.summary.total_items} />
                <StatCard icon={<Package size={20} />} label={t("adminReports.lowStock")} value={inventory.summary.low_stock_count} />
                <StatCard icon={<Package size={20} />} label={t("adminReports.expiring")} value={inventory.summary.expiring_count} />
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">{t("adminReports.valueByCategory")}</h3>
                <HBarList items={invCategoryItems} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="border-b border-border bg-muted/50 px-4 py-2.5 text-sm font-medium">
                    {t("adminReports.lowStock")} ({inventory.low_stock.length})
                  </div>
                  {inventory.low_stock.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("adminReports.noAlerts")}</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {inventory.low_stock.slice(0, 15).map((i) => (
                          <tr key={i.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-2.5 font-medium">{i.name}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {i.quantity}/{i.minimum_stock} {i.unit}
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge variant={i.quantity <= 0 ? "destructive" : "warning"}>
                                {i.quantity <= 0 ? t("adminReports.outOfStock") : t("inventory.lowStock")}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="border-b border-border bg-muted/50 px-4 py-2.5 text-sm font-medium">
                    {t("adminReports.expiring")} ({inventory.expiring.length})
                  </div>
                  {inventory.expiring.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("adminReports.noAlerts")}</p>
                  ) : (
                    <table className="w-full text-sm">
                      <tbody>
                        {inventory.expiring.slice(0, 15).map((i) => (
                          <tr key={i.id} className="border-b border-border last:border-0">
                            <td className="px-4 py-2.5 font-medium">{i.name}</td>
                            <td className="px-4 py-2.5 font-mono text-xs">{i.batch_number || "—"}</td>
                            <td className="px-4 py-2.5 text-xs">{i.expiry_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "mis" && mis && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<ClipboardList size={20} />} label={t("adminReports.admissions")} value={mis.summary.admissions} />
                <StatCard icon={<ClipboardList size={20} />} label={t("adminReports.discharges")} value={mis.summary.discharges} />
                <StatCard icon={<Users size={20} />} label={t("adminReports.census")} value={mis.summary.active_census} />
                <StatCard icon={<ClipboardList size={20} />} label={t("adminReports.avgStay")} value={`${mis.summary.avg_stay_days}d`} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={<ClipboardList size={20} />} label={t("adminReports.appointments")} value={mis.summary.appointments} />
                <StatCard icon={<ClipboardList size={20} />} label={t("adminReports.completedAppts")} value={mis.summary.completed_appointments} />
                <StatCard icon={<Users size={20} />} label={t("adminReports.bedOccupancy")} value={`${mis.summary.beds_occupied}/${mis.summary.beds_total}`} />
                <StatCard icon={<ClipboardList size={20} />} label={t("adminReports.labPending")} value={mis.summary.lab_pending} />
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">{t("adminReports.admDischart")}</h3>
                <div className="space-y-4">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">{t("adminReports.admissions")}</p>
                    <BarChart data={mis.daily.map((d) => ({ label: d.date, value: d.admissions || 0 }))} height={80} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">{t("adminReports.discharges")}</p>
                    <BarChart data={mis.daily.map((d) => ({ label: d.date, value: d.discharges || 0 }))} height={80} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
