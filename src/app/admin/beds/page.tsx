"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Bed } from "@/types/database";
import { useI18n } from "@/i18n/provider";

const EMPTY_FORM = {
  ward_name: "",
  bed_number: "",
  bed_type: "general" as Bed["bed_type"],
  daily_rate: 0,
};

export default function AdminBedsPage() {
  const { t } = useI18n();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadBeds();
  }, []);

  async function loadBeds() {
    const supabase = createClient();
    const { data } = await supabase.from("beds").select("*").order("ward_name");
    setBeds((data as Bed[]) || []);
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(bed: Bed) {
    setEditId(bed.id);
    setForm({
      ward_name: bed.ward_name,
      bed_number: bed.bed_number,
      bed_type: bed.bed_type,
      daily_rate: bed.daily_rate,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const url = editId ? `/api/beds/${editId}` : "/api/beds";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      cancelForm();
      await loadBeds();
    } else {
      const data = await res.json();
      alert(data.error || t("beds.saveFailed"));
    }

    setSaving(false);
  }

  async function handleDelete(bed: Bed) {
    if (!window.confirm(t("beds.deleteConfirm") + " " + bed.bed_number + " " + t("beds.ward") + " " + bed.ward_name + "?")) return;

    const res = await fetch(`/api/beds/${bed.id}`, { method: "DELETE" });
    if (res.ok) {
      await loadBeds();
    } else {
      const data = await res.json();
      alert(data.error || t("beds.deleteFailed"));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("beds.title")}</h1>
        {!showForm && (
          <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {t("beds.addBed")}
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">{editId ? t("beds.editBed") : t("beds.addBed")}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t("beds.wardName")}</label>
              <input
                type="text"
                required
                value={form.ward_name}
                onChange={(e) => setForm({ ...form, ward_name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("beds.bedNumber")}</label>
              <input
                type="text"
                required
                value={form.bed_number}
                onChange={(e) => setForm({ ...form, bed_number: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("beds.bedType")}</label>
              <select
                value={form.bed_type}
                onChange={(e) => setForm({ ...form, bed_type: e.target.value as Bed["bed_type"] })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="general">{t("beds.general")}</option>
                <option value="semi_private">{t("beds.semiPrivate")}</option>
                <option value="private">{t("beds.private")}</option>
                <option value="icu">{t("beds.icu")}</option>
                <option value="emergency">{t("beds.emergency")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("beds.dailyRate")}</label>
              <input
                type="number"
                required
                min={0}
                value={form.daily_rate}
                onChange={(e) => setForm({ ...form, daily_rate: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? t("beds.saving") : editId ? t("beds.updateBed") : t("beds.createBed")}
              </button>
              <button type="button" onClick={cancelForm} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                {t("common.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="animate-pulse text-muted-foreground">{t("beds.loading")}</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("beds.ward")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("beds.bedNo")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("beds.type")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("beds.status")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("beds.rate")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {beds.map((bed) => (
                <tr key={bed.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{bed.ward_name}</td>
                  <td className="px-4 py-3">{bed.bed_number}</td>
                  <td className="px-4 py-3 capitalize">{bed.bed_type.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${bed.is_occupied ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                      {bed.is_occupied ? t("beds.occupied") : t("beds.available")}
                    </span>
                  </td>
                  <td className="px-4 py-3">₹{bed.daily_rate}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(bed)} className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-muted">
                        {t("common.edit")}
                      </button>
                      <button onClick={() => handleDelete(bed)} className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                        {t("common.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {beds.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("beds.noBeds")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
