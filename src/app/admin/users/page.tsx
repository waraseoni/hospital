"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { SearchBar } from "@/components/ui/search-bar";
import { PageHeader } from "@/components/ui/page";
import { PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Profile, UserRole } from "@/types/database";
import { Shield, UserRound, Mail, Phone, Key, Power, Trash2, Edit3 } from "lucide-react";

const allRoles: UserRole[] = ["admin", "doctor", "nurse", "lab", "staff", "patient"];
const roleColors: Record<string, "info" | "success" | "warning" | "destructive"> = { doctor: "info", nurse: "success", lab: "warning", staff: "destructive", admin: "destructive", super_admin: "destructive", patient: "success" };

export default function AdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole>("admin");
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error(t("users.loadFailed"));
      const data = await res.json();
      setUsers(data);
    } catch { addToast("error", t("users.loadFailed")); }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!showResetModal || !resetPassword) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${showResetModal}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: resetPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast("success", t("users.passwordResetSuccess"));
      setShowResetModal(null);
      setResetPassword("");
      loadUsers();
    } catch (err: unknown) { addToast("error", (err as Error).message); }
    finally { setResetting(false); }
  }

  async function handleToggleRole(id: string, currentRole: UserRole) {
    const nextRole = allRoles[(allRoles.indexOf(currentRole) + 1) % allRoles.length];
    try {
      const res = await fetch(`/api/admin/users`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, role: nextRole }) });
      if (!res.ok) throw new Error("Failed to update role");
      addToast("success", t("users.roleUpdated") + ` ${nextRole}`);
      loadUsers();
    } catch { addToast("error", t("users.updateFailed")); }
  }

  async function handleDelete(id: string) {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/users/${deleting}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      addToast("success", t("users.deleted"));
      setDeleting(null);
      loadUsers();
    } catch { addToast("error", t("users.deleteFailed")); }
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "admin" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <PageContainer>
      <PageHeader title={t("users.title")} subtitle={t("users.subtitle")} actions={<Button onClick={loadUsers} variant="ghost"><Power size={16} className="mr-1" />{t("common.refresh")}</Button>} />

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder={t("users.searchPlaceholder")} />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as UserRole)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          {allRoles.map(r => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
        </select>
      </div>

      {loading ? <Skeleton lines={5} /> : filtered.length === 0 ? (
        <EmptyState title={t("users.noUsers")} description={t("users.noUsersDesc")} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium flex items-center gap-1"><UserRound size={14} />{t("common.name")}</th>
                <th className="px-4 py-3 text-left font-medium flex items-center gap-1"><Mail size={14} />{t("common.email")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.phone")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.role")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("common.created")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={roleColors[u.role] || "default"}>{t(`roles.${u.role}`)}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleToggleRole(u.id, u.role)} title={t("users.cycleRole")} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted" disabled={u.role === "admin" || u.role === "super_admin"}><Shield size={14} /></button>
                      <button onClick={() => { setShowResetModal(u.id); setResetPassword(""); }} title={t("users.resetPassword")} className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><Key size={14} /></button>
                      <button onClick={() => setDeleting(u.id)} title={t("users.deleteUser")} className="rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!showResetModal} onOpenChange={() => setShowResetModal(null)} title={t("users.resetPasswordTitle")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowResetModal(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleResetPassword} disabled={resetting || !resetPassword}>{resetting ? t("users.resetting") : t("users.reset")}</Button>
        </>
      }>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("users.enterPassword")}</p>
          <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder={t("auth.newPassword")} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" minLength={6} autoFocus />
        </div>
      </Modal>

      <Modal open={!!deleting} onOpenChange={() => setDeleting(null)} title={t("users.deleteTitle")} footer={
        <>
          <Button variant="ghost" onClick={() => setDeleting(null)}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={() => handleDelete(deleting!)}>{t("common.delete")}</Button>
        </>
      }>
        <p>{t("users.deleteConfirm")}</p>
      </Modal>
    </PageContainer>
  );
}
