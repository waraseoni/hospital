"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { SearchBar } from "@/components/ui/search-bar";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import type { Profile, UserRole } from "@/types/database";
import { Shield, UserRound, Mail, Phone, Key, Power, Trash2 } from "lucide-react";
import { ImpersonateStarter } from "@/components/layout/impersonate-starter";

const allRoles: UserRole[] = ["super_admin", "admin", "doctor", "nurse", "lab", "staff", "patient"];
const roleColors: Record<string, "info" | "success" | "warning" | "destructive"> = {
  super_admin: "destructive", admin: "destructive", doctor: "info", nurse: "success", lab: "warning", staff: "destructive", patient: "success",
};

export default function SuperAdminUsersPage() {
  const { t } = useI18n();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
  const [showResetModal, setShowResetModal] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("doctor");
  const { addToast } = useToast();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load");
      setUsers(await res.json());
    } catch { addToast("error", "Failed to load users"); }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!showResetModal || !resetPassword) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/users/${showResetModal}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: resetPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast("success", "Password reset successfully");
      setShowResetModal(null);
      setResetPassword("");
      loadUsers();
    } catch (err: unknown) { addToast("error", (err as Error).message); }
    finally { setResetting(false); }
  }

  async function handleUpdateRole() {
    if (!editingUser) return;
    try {
      const res = await fetch("/api/admin/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingUser.id, role: editRole }) });
      if (!res.ok) throw new Error("Failed to update role");
      addToast("success", `Role updated to ${editRole}`);
      setEditingUser(null);
      loadUsers();
    } catch { addToast("error", "Failed to update role"); }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      addToast("success", "User deleted");
      setDeleting(null);
      loadUsers();
    } catch { addToast("error", "Delete failed"); }
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  return (
    <PageContainer>
      <PageHeader title={t("superAdmin.allUsers")} subtitle={t("superAdmin.subtitle")} actions={<Button onClick={loadUsers} variant="ghost"><Power size={16} className="mr-1" />Refresh</Button>} />

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder={t("superAdmin.searchPlaceholder")} />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as UserRole | "all")} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
          <option value="all">All Roles</option>
          {allRoles.map(r => <option key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
        </select>
      </div>

      {loading ? <Skeleton lines={5} /> : filtered.length === 0 ? (
        <EmptyState title={t("superAdmin.noUsers")} description={t("superAdmin.noUsersDesc")} />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium"><UserRound size={14} className="inline mr-1" />{t("superAdmin.name")}</th>
                <th className="px-4 py-3 text-left font-medium"><Mail size={14} className="inline mr-1" />{t("superAdmin.email")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("superAdmin.phone")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("superAdmin.role")}</th>
                <th className="px-4 py-3 text-left font-medium">{t("superAdmin.created")}</th>
                <th className="px-4 py-3 text-right font-medium">{t("superAdmin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{u.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone || "—"}</td>
                  <td className="px-4 py-3"><Badge variant={roleColors[u.role] || "default"}>{u.role.replace("_", " ")}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {u.role !== "super_admin" && (
                        <ImpersonateStarter userId={u.id} role={u.role} />
                      )}
                      <button onClick={() => { setEditingUser(u); setEditRole(u.role); }} title="Edit role" className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><Shield size={14} /></button>
                      <button onClick={() => { setShowResetModal(u.id); setResetPassword(""); }} title="Reset password" className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"><Key size={14} /></button>
                      <button onClick={() => setDeleting(u.id)} title="Delete" className="rounded-lg border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Edit Modal */}
      <Modal open={!!editingUser} onOpenChange={() => setEditingUser(null)} title={t("superAdmin.changeRole")} footer={
        <>
          <Button variant="ghost" onClick={() => setEditingUser(null)}>{t("common.cancel")}</Button>
          <Button onClick={handleUpdateRole}>{t("common.save")}</Button>
        </>
      }>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Change role for <strong>{editingUser?.full_name}</strong></p>
          <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
            {allRoles.map(r => <option key={r} value={r}>{r.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
          </select>
        </div>
      </Modal>

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

      {/* Delete Modal */}
      <Modal open={!!deleting} onOpenChange={() => setDeleting(null)} title={t("superAdmin.deleteUser")} footer={
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
