"use client";

import { useEffect, useState } from "react";
import type { Branch } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";

const emptyForm = { name: "", code: "", address: "", phone: "", email: "" };

export default function AdminBranchesPage() {
  const { t } = useI18n();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("branches").select("*").order("created_at", { ascending: true });
    setBranches((data as Branch[]) || []);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(b: Branch) {
    setEditing(b);
    setForm({ name: b.name, code: b.code || "", address: b.address || "", phone: b.phone || "", email: b.email || "" });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { addToast("error", "Branch name is required"); return; }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      ...form,
      name: form.name.trim(),
      code: form.code.trim() || null,
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
    };
    const { error } = editing
      ? await supabase.from("branches").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editing.id)
      : await supabase.from("branches").insert(payload);
    if (!error) {
      addToast("success", editing ? "Branch updated" : "Branch created");
      setShowForm(false);
      load();
    } else {
      addToast("error", error.message);
    }
    setSaving(false);
  }

  async function toggleActive(b: Branch) {
    const supabase = createClient();
    const { error } = await supabase
      .from("branches")
      .update({ is_active: !b.is_active, updated_at: new Date().toISOString() })
      .eq("id", b.id);
    if (!error) load();
    else addToast("error", error.message);
  }

  async function handleDelete(b: Branch) {
    const supabase = createClient();
    const { error } = await supabase.from("branches").delete().eq("id", b.id);
    if (!error) { addToast("success", "Branch deleted"); load(); }
    else addToast("error", error.message);
  }

  if (loading) return <PageContainer><Skeleton lines={6} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        title={t("branches.title") || "Branches"}
        subtitle={t("branches.subtitle") || "Multi-branch / organization support"}
        actions={<Button onClick={openCreate}><Plus size={14} className="mr-1" />{t("branches.new") || "New Branch"}</Button>}
      />

      {branches.length === 0 ? (
        <EmptyState title={t("branches.none") || "No branches"} description={t("ui.noData")} action={<Button onClick={openCreate}>{t("branches.new") || "New Branch"}</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{b.name}</h3>
                    {b.code && <p className="text-xs text-muted-foreground">CODE: {b.code}</p>}
                  </div>
                </div>
                <Badge variant={b.is_active ? "success" : "muted"}>{b.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                {b.address && <p>{b.address}</p>}
                {b.phone && <p>{b.phone}</p>}
                {b.email && <p>{b.email}</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(b)}><Pencil size={12} className="mr-1" />{t("common.edit")}</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(b)}>{b.is_active ? "Deactivate" : "Activate"}</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(b)}><Trash2 size={12} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Branch" : "New Branch"} footer={
        <>
          <Button variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
          <Button onClick={(e) => handleSave(e as unknown as React.FormEvent)} disabled={saving}>{saving ? t("common.saving") : t("common.save")}</Button>
        </>
      }>
        <form onSubmit={handleSave} className="space-y-3">
          <Input label="Branch Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Main Branch" required />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MAIN" />
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}