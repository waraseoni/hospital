"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { LayoutDashboard, Users, UserRound, BedDouble, Package, ScrollText, UserCheck, Activity, Settings, Hospital, Receipt, CalendarCheck, SprayCan, Wrench, Truck, Droplets, MonitorPlay, BarChart3, BookOpen, Building2 } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", labelKey: "adminUsers.title", icon: UserCheck },
  { href: "/admin/staff", labelKey: "nav.staff", icon: Users },
  { href: "/admin/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
  { href: "/admin/patients", labelKey: "nav.patients", icon: UserRound },
  { href: "/admin/beds", labelKey: "nav.beds", icon: BedDouble },
  { href: "/admin/ipd", labelKey: "nav.ipd", icon: Hospital },
  { href: "/admin/inventory", labelKey: "nav.inventory", icon: Package },
  { href: "/admin/billing", labelKey: "nav.billing", icon: Receipt },
  { href: "/admin/reports", labelKey: "nav.reports", icon: BarChart3 },
  { href: "/admin/opd", labelKey: "nav.opd", icon: Activity },
  { href: "/admin/housekeeping", labelKey: "nav.housekeeping", icon: SprayCan },
  { href: "/admin/equipment", labelKey: "nav.equipment", icon: Wrench },
  { href: "/admin/ambulance", labelKey: "nav.ambulance", icon: Truck },
  { href: "/admin/blood-bank", labelKey: "nav.bloodBank", icon: Droplets },
  { href: "/admin/branches", labelKey: "nav.branches", icon: Building2 },
  { href: "/public/queue", labelKey: "nav.queue", icon: MonitorPlay },
  { href: "/admin/audit", labelKey: "nav.auditLogs", icon: ScrollText },
  { href: "/admin/api-docs", labelKey: "nav.apiDocs", icon: BookOpen },
  { href: "/admin/settings", labelKey: "admin.settingsTitle", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data || data.role !== "admin") { router.push("/login"); return; }
      setProfile(data);
    }
    loadProfile();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <AppShell
      titleKey="roles.admin"
      subtitle={profile?.full_name}
      navItems={navItems}
      user={profile}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}