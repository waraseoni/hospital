"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Bed } from "@/types/database";

export default function StaffRoomsPage() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);

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
    loadBeds();
  }

  async function markDirty(bedId: string) {
    const supabase = createClient();
    await supabase.from("beds").update({ is_ready: false }).eq("id", bedId);
    loadBeds();
  }

  const wards = Array.from(new Set(beds.map(b => b.ward_name)));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Room & Bed Status</h1>
      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-6">
          {wards.map(ward => (
            <section key={ward}>
              <h2 className="text-lg font-semibold mb-3">{ward}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {beds.filter(b => b.ward_name === ward).map(bed => (
                  <div key={bed.id} className={`rounded-xl border p-4 ${bed.is_ready ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Bed {bed.bed_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bed.is_ready ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {bed.is_ready ? "Ready" : "Needs Cleaning"}
                      </span>
                    </div>
                    {bed.is_occupied && <p className="text-xs text-muted-foreground mb-2">Occupied</p>}
                    {bed.is_ready ? (
                      <button onClick={() => markDirty(bed.id)} className="w-full rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700">
                        Mark Dirty
                      </button>
                    ) : (
                      <button onClick={() => markReady(bed.id)} className="w-full rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700">
                        Mark Clean
                      </button>
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
