"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/ui/page";
import { PageContainer } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, UserRound, Phone, Mail, MapPin, Stethoscope } from "lucide-react";

export default function ProfilePage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", specialization: "", qualification: "", address: "" });
  const { addToast } = useToast();

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) { setProfile(data); setForm({ full_name: data.full_name || "", phone: data.phone || "", email: data.email || "", specialization: data.specialization || "", qualification: data.qualification || "", address: data.address || "" }); }
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

  const roleColors: Record<string, "info" | "success" | "warning" | "destructive"> = { doctor: "info", nurse: "success", lab: "warning", staff: "destructive", admin: "info", patient: "success" };

  if (loading) return <PageContainer><Skeleton lines={5} /></PageContainer>;
  if (!profile) return <PageContainer><p>{t("common.notFound")}</p></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("profile.title")} actions={<Button variant="ghost" onClick={() => setEditing(!editing)}>{editing ? t("common.cancel") : t("profile.edit")}</Button>} />
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound size={32} /></div>
            <div>
              <h2 className="text-xl font-bold">{profile.full_name}</h2>
              <Badge variant={roleColors[profile.role] || "default"} className="mt-1">{profile.role}</Badge>
              {profile.specialization && <p className="mt-1 text-sm text-muted-foreground">{profile.specialization}</p>}
            </div>
          </div>
        </div>

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
                <div className="flex items-center gap-3"><Stethoscope size={18} className="text-muted-foreground" /><span className="text-sm text-muted-foreground">{t("profile.specialization")}:</span><span className="font-medium">{profile.specialization}</span></div>
              )}
              {profile.qualification && (
                <div className="flex items-center gap-3"><Activity size={18} className="text-muted-foreground" /><span className="text-sm text-muted-foreground">{t("profile.qualification")}:</span><span className="font-medium">{profile.qualification}</span></div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
