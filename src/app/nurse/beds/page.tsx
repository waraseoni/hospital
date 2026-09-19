"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Bed } from "@/types/database";

export default function NurseBedsPage() {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBeds(); }, []);

  async function loadBeds() {
    const supabase = createClient();
    const { data } = await supabase.from("beds").select("*").order("ward_name");
    setBeds((data as Bed[]) || []);
    setLoading(false);
  }

  async function toggleOccupancy(bed: Bed) {
    const supabase = createClient();
    await supabase.from("beds").update({ is_occupied: !bed.is_occupied, current_patient_id: bed.is_occupied ? null : bed.current_patient_id }).eq("id", bed.id);
    loadBeds();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bed Management</h1>
      {loading ? (
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {beds.map((bed) => (
            <div key={bed.id} className={`rounded-xl border p-4 ${bed.is_occupied ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{bed.ward_name} - {bed.bed_number}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bed.is_occupied ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {bed.is_occupied ? "Occupied" : "Available"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground capitalize mb-1">Type: {bed.bed_type.replace("_", " ")}</p>
              <button onClick={() => toggleOccupancy(bed)} className={`mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium ${bed.is_occupied ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"}`}>
                {bed.is_occupied ? "Mark Clean / Free" : "Allot Bed"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
