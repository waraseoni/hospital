"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Profile } from "@/types/database";
import { UserRound, Mail, Key, Trash2, UserPlus } from "lucide-react";

export default function SuperAdminAdminsPage() {
  const { t } = useI18n();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", role: "admin" as Profile["role"] });
  const [submitting, setSubmitting] = useState(false);
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadAdmins(); }, []);

  async function loadAdmins() {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setAdmins(data.filter((u: Profile) => u.role === "admin" || u.role === "super_admin"));
    } catch { addToast("error", t("common.notFound")); }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast("success", t("superAdmin.adminCreateSuccess"));
      setShowForm(false);
      setForm({ full_name: "", email: "", password: "", phone: "", role: "admin" });
      loadAdmins();
    } catch (err: unknown) { addToast("error", (err as Error).message); }
    finally { setSubmitting(false); }
  }

  async function handleResetPassword() {
    if (!showResetModal || !resetPassword) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${showResetModal}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: resetPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast("success", t("superAdmin.passwordResetSuccess"));
      setShowResetModal(null);
      setResetPassword("");
      loadAdmins();
    } catch (err: unknown) { addToast("error", (err as Error).message); }
    finally { setResetting(false); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("common.notFound"));
      addToast("success", t("superAdmin.adminDeleted"));
      setDeleting(null);
      loadAdmins();
    } catch { addToast("error", t("common.notFound")); }
  }

  return (
    <PageContainer>
      <PageHeader title={t("superAdmin.admins")} subtitle={t("superAdmin.subtitle")} actions={
        <Button onClick={() => setShowForm(!showForm)}><UserPlus size={16} className="mr-1" />{t("superAdmin.addAdmin")}</Button>
      } />

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("superAdmin.addNewAdmin")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input placeholder={t("staff.fullName")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <Input placeholder={t("staff.email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input placeholder={t("staff.password")} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            <Input placeholder={t("staff.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Profile["role"] })} options={[{ value: "admin", label: t("roles.admin") }, { value: "super_admin", label: t("roles.superAdmin") }]} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? t("common.saving") : t("superAdmin.createAdmin")}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
          </div>
        </form>
      )}

      {loading ? <Skeleton lines={5} /> : admins.length === 0 ? (
        <EmptyState title={t("superAdmin.noUsers")} description={t("ui.noData")} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t("superAdmin.name")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("superAdmin.email")}</th>
              <th className="px-4 py-3 text-left font-medium">{t("superAdmin.role")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("superAdmin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{a.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.email || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={a.role === "super_admin" ? "destructive" : "info"}>{a.role.replace("_", " ")}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
<button onClick={() => { setShowResetModal(a.id); setResetPassword(""); }} title={t("superAdmin.resetPassword")} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><Key size={14} /></button>
                       <button onClick={() => setDeleting(a.id)} title={t("common.delete")} className="rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!showResetModal} onOpenChange={() => setShowResetModal(null)} title={t("superAdmin.resetPassword")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowResetModal(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleResetPassword} disabled={resetting || !resetPassword}>{resetting ? t("superAdmin.resetting") : t("superAdmin.reset")}</Button>
        </>
      }>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("superAdmin.enterNewPassword")}</p>
          <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder={t("superAdmin.newPassword")} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" minLength={6} autoFocus />
        </div>
      </Modal>

      <Modal open={!!deleting} onOpenChange={() => setDeleting(null)} title={t("superAdmin.deleteAdmin")} footer={
        <>
          <Button variant="ghost" onClick={() => setDeleting(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={() => handleDelete(deleting!)}>{t("common.delete")}</Button>
        </>
      }>
        <p>{t("superAdmin.deleteConfirm")}</p>
      </Modal>
    </PageContainer>
  );
}
