"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageContainer } from "@/components/ui/page";
import type { Settings } from "@/lib/settings";

const defaultSettings: Partial<Settings> = {
  hospital_name: "",
  hospital_address: "",
  hospital_phone: "",
  hospital_email: "",
  hospital_gstin: "",
  logo_url: "",
  tax_rate: 0,
  receipt_footer: "",
  whatsapp_number: "",
  upi_id: "",
  currency: "INR",
};

export default function AdminSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Partial<Settings>>(defaultSettings);
  const [branches, setBranches] = useState<{ id: string; name: string; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const supabase = createClient();
    const [settingsRes, branchesRes] = await Promise.all([
      supabase.from("settings").select("*").limit(1).single(),
      supabase.from("branches").select("id, name, is_active").order("created_at", { ascending: true }),
    ]);
    const { data } = settingsRes;
    if (data) setSettings(data);
    setBranches((branchesRes.data as { id: string; name: string; is_active: boolean }[]) || []);
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: existing } = await supabase.from("settings").select("id").limit(1).single();

    if (existing) {
      const { error } = await supabase.from("settings").update(settings).eq("id", existing.id);
      if (error) addToast("error", error.message);
      else addToast("success", t("common.save") + " ✓");
    } else {
      const { error } = await supabase.from("settings").insert(settings);
      if (error) addToast("error", error.message);
      else addToast("success", t("common.save") + " ✓");
    }
    setSaving(false);
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("admin.settingsTitle")} subtitle={t("admin.settingsSubtitle")} />

      <form onSubmit={handleSave} className="space-y-4">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t("admin.settingsHospital")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsHospitalName")}</label>
              <Input value={settings.hospital_name || ""} onChange={(e) => update("hospital_name", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsPhone")}</label>
              <Input value={settings.hospital_phone || ""} onChange={(e) => update("hospital_phone", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsAddress")}</label>
              <Input value={settings.hospital_address || ""} onChange={(e) => update("hospital_address", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsEmail")}</label>
              <Input type="email" value={settings.hospital_email || ""} onChange={(e) => update("hospital_email", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsGstin")}</label>
              <Input value={settings.hospital_gstin || ""} onChange={(e) => update("hospital_gstin", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t("admin.settingsBilling")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsTaxRate")}</label>
              <Input type="number" step="0.01" value={settings.tax_rate ?? 0} onChange={(e) => update("tax_rate", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsCurrency")}</label>
              <Input value={settings.currency || "INR"} onChange={(e) => update("currency", e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsUpiId")}</label>
              <Input value={settings.upi_id || ""} onChange={(e) => update("upi_id", e.target.value)} placeholder="hospital@upi" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsReceiptFooter")}</label>
              <Input value={settings.receipt_footer || ""} onChange={(e) => update("receipt_footer", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t("admin.settingsWhatsapp")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsWhatsappNumber")}</label>
              <Input value={settings.whatsapp_number || ""} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="+91XXXXXXXXXX" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t("admin.settingsLogoUrl")}</label>
              <Input value={settings.logo_url || ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Branch</h3>
          <div>
            <label className="text-xs font-medium mb-1 block">Active Branch</label>
            <select
              value={settings.branch_id || ""}
              onChange={(e) => update("branch_id", e.target.value || null)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {branches.filter(b => b.is_active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">Branches manage karein: Admin → Branches</p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
