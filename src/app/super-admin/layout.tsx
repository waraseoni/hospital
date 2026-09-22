"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { fetchImpersonation } from "@/lib/auth/impersonation-client";
import { LayoutDashboard, Users, UserRound, BedDouble, Package, ScrollText, UserCheck, Activity } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/super-admin", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/super-admin/users", labelKey: "superAdmin.allUsers", icon: UserCheck },
  { href: "/super-admin/admins", labelKey: "superAdmin.admins", icon: Users },
  { href: "/super-admin/staff", labelKey: "nav.staff", icon: Users },
  { href: "/super-admin/patients", labelKey: "nav.patients", icon: UserRound },
  { href: "/super-admin/beds", labelKey: "nav.beds", icon: BedDouble },
  { href: "/super-admin/inventory", labelKey: "nav.inventory", icon: Package },
  { href: "/super-admin/opd", labelKey: "nav.opd", icon: Activity },
  { href: "/super-admin/audit", labelKey: "nav.auditLogs", icon: ScrollText },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const [{ data }, imp] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        fetchImpersonation(),
      ]);
      if (!data || data.role !== "super_admin") { router.push("/login"); return; }
      if (imp.active && imp.role) { router.push(`/${imp.role}`); return; }
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
      titleKey="roles.superAdmin"
      subtitle={profile?.full_name}
      navItems={navItems}
      user={profile}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}
