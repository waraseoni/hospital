"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Bed, Patient } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export default function NurseBedsPage() {
  const { t } = useI18n();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [allotModal, setAllotModal] = useState<Bed | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assigning, setAssigning] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadBeds(); }, []);

  async function loadBeds() {
    const supabase = createClient();
    const { data } = await supabase.from("beds").select("*").order("ward_name");
    setBeds((data as Bed[]) || []);
    setLoading(false);
  }

  async function searchPatients() {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").ilike("name", `%${patientSearch}%`).limit(10);
    setPatients((data as Patient[]) || []);
  }

  async function assignPatient(bed: Bed, patientId: string) {
    setAssigning(true);
    const supabase = createClient();
    const { error } = await supabase.from("beds").update({ is_occupied: true, current_patient_id: patientId }).eq("id", bed.id);
    if (!error) {
      addToast("success", t("nurseBeds.bedAssigned"));
      setAllotModal(null);
      setPatientSearch("");
      loadBeds();
    } else {
      addToast("error", t("nurseBeds.assignFailed"));
    }
    setAssigning(false);
  }

  async function toggleOccupancy(bed: Bed) {
    const supabase = createClient();
    await supabase.from("beds").update({ is_occupied: !bed.is_occupied, current_patient_id: bed.is_occupied ? null : bed.current_patient_id }).eq("id", bed.id);
    loadBeds();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{t("nurseBeds.title")}</h1>
      {loading ? (
        <div className="animate-pulse text-muted-foreground">{t("ui.loading")}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {beds.map((bed) => (
            <div key={bed.id} className={`rounded-xl border p-4 ${bed.is_occupied ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{bed.ward_name} - {bed.bed_number}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bed.is_occupied ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {bed.is_occupied ? t("nurseBeds.occupied") : t("nurseBeds.available")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground capitalize mb-1">{t("nurseBeds.type")}: {bed.bed_type.replace("_", " ")}</p>
              {bed.is_occupied ? (
                <button onClick={() => toggleOccupancy(bed)} className="mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700">
                  {t("nurseBeds.markClean")}
                </button>
              ) : (
                <button onClick={() => { setAllotModal(bed); setPatientSearch(""); }} className="mt-2 w-full rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
                  {t("nurseBeds.allotBed")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!allotModal} onOpenChange={() => setAllotModal(null)} title={t("nurseBeds.allotBed")} footer={
        <>
          <Button variant="ghost" onClick={() => setAllotModal(null)}>{t("common.cancel")}</Button>
          <Button onClick={() => allotModal && assignPatient(allotModal, patientSearch)} disabled={!patientSearch || assigning}>
            {assigning ? t("ui.loading") : t("nurseBeds.assign")}
          </Button>
        </>
      }>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("nurseBeds.selectPatient")}: {allotModal?.ward_name} - {allotModal?.bed_number}
          </p>
          <Input placeholder={t("ui.search")} value={patientSearch} onChange={(e) => { setPatientSearch(e.target.value); searchPatients(); }} />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {patients.map((p) => (
               <button key={p.id} onClick={() => allotModal && assignPatient(allotModal, p.id)} className="w-full text-left rounded-lg px-3 py-2 hover:bg-muted text-sm">
                {p.name} ({p.uhid})
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
