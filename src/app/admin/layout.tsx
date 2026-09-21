"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { LayoutDashboard, Users, UserRound, BedDouble, Package, ScrollText, UserCheck, Activity, Settings } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", labelKey: "adminUsers.title", icon: UserCheck },
  { href: "/admin/staff", labelKey: "nav.staff", icon: Users },
  { href: "/admin/patients", labelKey: "nav.patients", icon: UserRound },
  { href: "/admin/beds", labelKey: "nav.beds", icon: BedDouble },
  { href: "/admin/inventory", labelKey: "nav.inventory", icon: Package },
  { href: "/admin/opd", labelKey: "nav.opd", icon: Activity },
  { href: "/admin/audit", labelKey: "nav.auditLogs", icon: ScrollText },
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