"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { LayoutDashboard, ClipboardList, SquarePen, UserRound } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/doctor", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/doctor/opd", labelKey: "nav.opdQueue", icon: ClipboardList },
  { href: "/doctor/prescriptions/new", labelKey: "nav.newPrescription", icon: SquarePen },
  { href: "/doctor/patients", labelKey: "nav.myPatients", icon: UserRound },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data || data.role !== "doctor") { router.push("/login"); return; }
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
      titleKey="roles.doctor"
      subtitle={profile ? `Dr. ${profile.full_name}` : undefined}
      navItems={navItems}
      user={profile}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}