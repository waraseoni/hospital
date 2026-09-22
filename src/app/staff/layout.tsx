"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { LayoutDashboard, Folder, Users2, ClipboardList, AlertTriangle, Pill, ClipboardCheck, FileStack } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/staff", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/staff/reception", labelKey: "nav.reception", icon: ClipboardList },
  { href: "/staff/rooms", labelKey: "nav.roomStatus", icon: Folder },
  { href: "/staff/emergency", labelKey: "nav.emergency", icon: AlertTriangle },
  { href: "/staff/pharmacy", labelKey: "nav.pharmacy", icon: Pill },
  { href: "/staff/pharmacy/dispense", labelKey: "pharmacy.dispenseTitle", icon: ClipboardCheck },
  { href: "/staff/pharmacy/requisitions", labelKey: "nav.requisitions", icon: Users2 },
  { href: "/staff/claims", labelKey: "nav.claims", icon: FileStack },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data || data.role !== "staff") { router.push("/login"); return; }
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
      titleKey="roles.staff"
      subtitle={profile?.full_name}
      navItems={navItems}
      user={profile}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}