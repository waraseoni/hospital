"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Prescription, InventoryItem, Patient } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/ui/modal";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { FileText, Package } from "lucide-react";

interface MatchLine {
  medicine_name: string;
  inventory_item_id: string;
  quantity: number;
}

export default function PharmacyDispensePage() {
  const { t } = useI18n();
  const [prescriptions, setPrescriptions] = useState<(Prescription & { patient?: Patient })[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [matches, setMatches] = useState<MatchLine[]>([]);
  const [dispensing, setDispensing] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [rx, inv] = await Promise.all([
        supabase.from("prescriptions").select("*, patient:patients(name, uhid)").order("created_at", { ascending: false }).limit(50),
        supabase.from("inventory_items").select("*").order("name"),
      ]);
      setPrescriptions((rx.data as (Prescription & { patient?: Patient })[]) || []);
      setInventory((inv.data as InventoryItem[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  function openDispense(rx: Prescription) {
    setSelected(rx);
    const lines = (rx.medicines || []).filter(m => m.name?.trim()).map(m => ({
      medicine_name: m.name,
      inventory_item_id: "",
      quantity: 1,
    }));
    setMatches(lines);
  }

  function findInventoryId(name: string): string {
    const lower = name.toLowerCase();
    const exact = inventory.find(i => i.name.toLowerCase() === lower);
    if (exact) return exact.id;
    const partial = inventory.find(i => i.name.toLowerCase().includes(lower) || lower.includes(i.name.toLowerCase()));
    return partial?.id || "";
  }

  async function handleDispense() {
    if (!selected) return;
    const valid = matches.filter(m => m.inventory_item_id && m.quantity > 0);
    if (valid.length === 0) {
      addToast("error", t("pharmacy.matchRequired"));
      return;
    }
    setDispensing(true);
    try {
      const res = await fetch("/api/pharmacy/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescription_id: selected.id,
          items: valid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pharmacy.dispenseFailed"));
      addToast("success", t("pharmacy.dispenseSuccess"));
      setSelected(null);
      setMatches([]);
      const supabase = createClient();
      const { data: inv } = await supabase.from("inventory_items").select("*").order("name");
      setInventory((inv as InventoryItem[]) || []);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setDispensing(false);
    }
  }

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("pharmacy.dispenseTitle")} subtitle={t("pharmacy.dispenseSubtitle")} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t("common.date")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("nav.patients")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("common.name")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("pharmacy.medicines")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {prescriptions.map(rx => (
              <tr key={rx.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-muted-foreground">{new Date(rx.created_at).toLocaleDateString("en-IN")}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{rx.patient?.name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{rx.patient?.uhid}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{rx.diagnosis}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{(rx.medicines || []).length}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => openDispense(rx)}>
                    <FileText size={12} className="mr-1" /> {t("pharmacy.dispense")}
                  </Button>
                </td>
              </tr>
            ))}
            {prescriptions.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">{t("ui.noData")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!selected}
        onOpenChange={() => { setSelected(null); setMatches([]); }}
        title={t("pharmacy.dispenseTitle")}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setSelected(null); setMatches([]); }}>{t("common.cancel")}</Button>
            <Button onClick={handleDispense} disabled={dispensing}>
              <Package size={14} className="mr-1" />
              {dispensing ? t("common.saving") : t("pharmacy.issueStock")}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {selected?.patient ? `${selected.patient.name} — ` : ""}{selected?.diagnosis}
          </p>
          {matches.map((m, i) => {
            const autoId = findInventoryId(m.medicine_name);
            const inv = inventory.find(x => x.id === (m.inventory_item_id || autoId));
            return (
              <div key={i} className="grid gap-2 sm:grid-cols-3 items-end rounded-lg border border-border p-3">
                <div>
                  <p className="text-xs font-medium mb-1">{m.medicine_name}</p>
                  <select
                    value={m.inventory_item_id || autoId}
                    onChange={(e) => {
                      setMatches(prev => prev.map((p, idx) => idx === i ? { ...p, inventory_item_id: e.target.value } : p));
                    }}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="">{t("pharmacy.selectItem")}</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                        {item.name} ({item.quantity} {item.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">{t("inventory.qty")}</p>
                  <input
                    type="number"
                    min={1}
                    max={inv?.quantity || 999}
                    value={m.quantity}
                    onChange={(e) => setMatches(prev => prev.map((p, idx) => idx === i ? { ...p, quantity: Number(e.target.value) } : p))}
                    className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                  />
                </div>
                <div className="text-xs text-muted-foreground pb-1">
                  {inv ? (
                    <Badge variant={inv.quantity < m.quantity ? "destructive" : "success"}>
                      {inv.quantity} {inv.unit}
                    </Badge>
                  ) : (
                    <Badge variant="warning">{t("pharmacy.noMatch")}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </PageContainer>
  );
}
