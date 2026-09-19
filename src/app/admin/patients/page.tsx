"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Patient } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function AdminPatientsPage() {
  const { t } = useI18n();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", dob: "", gender: "male" as Patient["gender"], phone: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    const supabase = createClient();
    const { data } = await supabase.from("patients").select("*").order("created_at", { ascending: false });
    setPatients((data as Patient[]) || []);
    setLoading(false);
  }

  function resetForm() {
    setForm({ name: "", dob: "", gender: "male", phone: "", address: "" });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(p: Patient) {
    setForm({ name: p.name, dob: p.dob, gender: p.gender, phone: p.phone, address: p.address });
    setEditingId(p.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const supabase = createClient();

    try {
      if (editingId) {
        const { error: updateError } = await supabase.from("patients").update({ name: form.name, dob: form.dob, gender: form.gender, phone: form.phone, address: form.address }).eq("id", editingId);
        if (updateError) throw updateError;
        addToast("success", t("patients.updatedSuccess"));
      } else {
        const res = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        addToast("success", t("patients.createdSuccess"));
      }
      resetForm();
      loadPatients();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message);
      addToast("error", error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(p: Patient) {
    if (!window.confirm(t("patients.deleteConfirm") + " " + p.name + "?")) return;
    setError("");

    const supabase = createClient();
    const { error: deleteError } = await supabase.from("patients").delete().eq("id", p.id);

    if (deleteError) {
      setError(deleteError.message);
      addToast("error", deleteError.message);
      return;
    }

    addToast("success", t("patients.deletedSuccess"));
    loadPatients();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("patients.title")}</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>{t("patients.addPatient")}</Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? t("patients.editPatient") : t("patients.addNewPatient")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder={t("patients.fullName")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} required />
            <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Patient["gender"] })} options={[{ value: "male", label: t("patients.male") }, { value: "female", label: t("patients.female") }, { value: "other", label: t("patients.other") }]} />
            <Input placeholder={t("patients.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            <Input placeholder={t("patients.address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? (editingId ? t("patients.updating") : t("patients.creating")) : (editingId ? t("patients.updatePatient") : t("patients.createPatient"))}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>{t("common.cancel")}</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse text-muted-foreground">{t("ui.loading")}</div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t("patients.uhid")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("patients.name")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("patients.dob")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("patients.gender")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("patients.phone")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("patients.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.uhid}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.dob}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${p.gender === "male" ? "bg-blue-100 text-blue-800" : p.gender === "female" ? "bg-pink-100 text-pink-800" : "bg-purple-100 text-purple-800"}`}>
                      {p.gender}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(p)} className="rounded-lg border border-border px-3 py-1 text-xs hover:bg-muted">{t("common.edit")}</button>
                      <button onClick={() => handleDelete(p)} className="rounded-lg border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10">{t("common.delete")}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t("patients.noPatients")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
