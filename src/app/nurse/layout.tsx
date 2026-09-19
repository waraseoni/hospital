"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { LayoutDashboard, HeartPulse, BedDouble, UserCog } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/nurse", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/nurse/vitals", labelKey: "nav.recordVitals", icon: HeartPulse },
  { href: "/nurse/beds", labelKey: "nav.bedManagement", icon: BedDouble },
  { href: "/profile", labelKey: "nav.profile", icon: UserCog },
];

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data || data.role !== "nurse") { router.push("/login"); return; }
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
      titleKey="roles.nurse"
      subtitle={profile?.full_name}
      navItems={navItems}
      user={profile}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}