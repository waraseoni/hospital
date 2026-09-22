"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, UserRound, Phone, Mail, MapPin, Stethoscope, Key, Shield, Camera, PenLine } from "lucide-react";

export default function ProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", specialization: "", qualification: "", address: "" });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ new_password: "", confirm_password: "" });
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile(data);
      setForm({ full_name: data.full_name || "", phone: data.phone || "", email: data.email || "", specialization: data.specialization || "", qualification: data.qualification || "", address: data.address || "" });
    }
    setLoading(false);
  }

  async function handleSave() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    if (!error) { addToast("success", t("profile.savedSuccess")); setEditing(false); loadProfile(); }
    else addToast("error", "Failed to save");
  }

  async function handleAvatar(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      addToast("error", "Please choose a JPEG, PNG or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast("error", "Image must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingAvatar(false); return; }
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { addToast("error", upErr.message); setUploadingAvatar(false); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    if (!error) { addToast("success", "Avatar updated"); loadProfile(); }
    else addToast("error", error.message);
    setUploadingAvatar(false);
  }

  async function handleSignature(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      addToast("error", "Please choose a JPEG, PNG or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast("error", "Image must be under 5MB");
      return;
    }
    setUploadingSignature(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploadingSignature(false); return; }
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `signatures/${user.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("signatures").upload(path, file, { upsert: true });
    if (upErr) { addToast("error", upErr.message); setUploadingSignature(false); return; }
    const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ signature_url: urlData.publicUrl }).eq("id", user.id);
    if (!error) { addToast("success", "Signature updated"); loadProfile(); }
    else addToast("error", error.message);
    setUploadingSignature(false);
  }

  async function handlePasswordChange() {
    if (passwords.new_password !== passwords.confirm_password) {
      addToast("error", t("profile.passwordMismatch") || "Passwords do not match");
      return;
    }
    if (passwords.new_password.length < 6) {
      addToast("error", t("profile.passwordMinLength") || "Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: passwords.new_password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast("success", t("profile.passwordChanged") || "Password changed successfully");
      setShowPasswordModal(false);
      setPasswords({ new_password: "", confirm_password: "" });
    } catch (err: unknown) {
      addToast("error", (err as Error).message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  }

  const roleColors: Record<string, "info" | "success" | "warning" | "destructive" | "default"> = {
    super_admin: "destructive",
    admin: "destructive",
    doctor: "info",
    nurse: "success",
    lab: "warning",
    staff: "destructive",
    patient: "success",
  };

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;
  if (!profile) return <PageContainer><p>{t("common.notFound")}</p></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("profile.title")} actions={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowPasswordModal(true)}><Key size={16} className="mr-1" />{t("profile.changePassword")}</Button>
          <Button variant="ghost" onClick={() => setEditing(!editing)}>{editing ? t("common.cancel") : t("profile.edit")}</Button>
        </div>
      } />
      <div className="max-w-2xl space-y-6">
        {/* Profile Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.full_name} className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound size={32} />
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                <Camera size={11} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatar(f); }}
                />
              </label>
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <Badge variant={roleColors[profile.role] || "default"} className="mt-1">
                <Shield size={12} className="mr-1" />
                {profile.role === "super_admin" ? "Super Admin" : profile.role}
              </Badge>
              {profile.specialization && <p className="mt-1 text-sm text-muted-foreground">{profile.specialization}</p>}
            </div>
          </div>
        </div>

        {/* Doctor Signature */}
        {profile.role === "doctor" && (
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-semibold"><PenLine size={16} className="text-primary" />Digital Signature</h3>
                <p className="mt-1 text-sm text-muted-foreground">This signature is stamped on your prescriptions (e-prescription).</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20">
                <Camera size={14} />
                {uploadingSignature ? "Uploading..." : "Upload Signature"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingSignature}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSignature(f); }}
                />
              </label>
            </div>
            {profile.signature_url && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.signature_url}
                  alt="Doctor signature"
                  className="h-14 w-auto max-w-[200px] object-contain"
                />
              </div>
            )}
            {profile.license_number && (
              <p className="mt-3 text-xs text-muted-foreground">Registration No: {profile.license_number}</p>
            )}
          </div>
        )}

        {/* Edit Form */}
        {editing ? (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">{t("profile.editProfile")}</h2>
            <Input label={t("profile.fullName")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label={t("profile.phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label={t("profile.email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label={t("profile.address")} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            {profile.role === "doctor" && <Input label={t("profile.specialization")} value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />}
            <Button onClick={handleSave}>{t("profile.save")}</Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">{t("profile.details")}</h2>
            <div className="grid gap-3">
              {[
                { icon: Phone, label: t("profile.phone"), value: profile.phone },
                { icon: Mail, label: t("profile.email"), value: profile.email },
                { icon: MapPin, label: t("profile.address"), value: profile.address },
              ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon size={18} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{label}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              {profile.specialization && (
                <div className="flex items-center gap-3">
                  <Stethoscope size={18} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("profile.specialization")}:</span>
                  <span className="font-medium">{profile.specialization}</span>
                </div>
              )}
              {profile.qualification && (
                <div className="flex items-center gap-3">
                  <Activity size={18} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{t("profile.qualification")}:</span>
                  <span className="font-medium">{profile.qualification}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      <Modal open={showPasswordModal} onOpenChange={setShowPasswordModal} title={t("profile.changePassword")} footer={
        <>
          <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>{t("common.cancel")}</Button>
          <Button onClick={handlePasswordChange} disabled={changingPassword}>
            {changingPassword ? t("profile.changingPassword") : t("profile.changePassword")}
          </Button>
        </>
      }>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("profile.passwordHint") || "Enter your new password below."}</p>
          <Input label={t("profile.newPassword")} type="password" value={passwords.new_password} onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })} placeholder="Min 6 characters" />
          <Input label={t("profile.confirmPassword")} type="password" value={passwords.confirm_password} onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })} placeholder="Re-enter password" />
        </div>
      </Modal>
    </PageContainer>
  );
}
