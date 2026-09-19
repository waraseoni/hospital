"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Bed } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page";

export default function StaffRoomsPage() {
  const { t } = useI18n();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => { loadBeds(); }, []);

  async function loadBeds() {
    const supabase = createClient();
    const { data } = await supabase.from("beds").select("*").order("ward_name");
    setBeds((data as Bed[]) || []);
    setLoading(false);
  }

  async function markReady(bedId: string) {
    const supabase = createClient();
    await supabase.from("beds").update({ is_ready: true }).eq("id", bedId);
    addToast("success", "Bed marked ready");
    loadBeds();
  }

  async function markDirty(bedId: string) {
    const supabase = createClient();
    await supabase.from("beds").update({ is_ready: false }).eq("id", bedId);
    addToast("success", "Bed marked dirty");
    loadBeds();
  }

  const wards = Array.from(new Set(beds.map(b => b.ward_name)));

  return (
    <div>
      <PageHeader title={t("rooms.title")} />
      {loading ? <Skeleton lines={5} /> : (
        <div className="space-y-6">
          {wards.map(ward => (
            <section key={ward}>
              <h2 className="text-lg font-semibold mb-3">{ward}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {beds.filter(b => b.ward_name === ward).map(bed => (
                  <div key={bed.id} className={`rounded-xl border p-4 ${bed.is_ready ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{t("rooms.bed")} {bed.bed_number}</span>
                      <Badge variant={bed.is_ready ? "success" : "destructive"}>{bed.is_ready ? t("rooms.ready") : t("rooms.needsCleaning")}</Badge>
                    </div>
                    {bed.is_occupied && <p className="mb-2 text-xs text-muted-foreground">{t("rooms.occupied")}</p>}
                    {bed.is_ready ? (
                      <Button size="sm" variant="destructive" onClick={() => markDirty(bed.id)} className="w-full">{t("rooms.markDirty")}</Button>
                    ) : (
                      <Button size="sm" variant="secondary" className="bg-green-600 text-white hover:bg-green-700" onClick={() => markReady(bed.id)}>{t("rooms.markClean")}</Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
