"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { effectiveRoleOf, fetchImpersonation } from "@/lib/auth/impersonation-client";
import { LayoutDashboard, TestTube, Scan } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/lab", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/lab/queue", labelKey: "nav.testQueue", icon: TestTube },
  { href: "/lab/imaging", labelKey: "nav.imaging", icon: Scan },
];

export default function LabLayout({ children }: { children: React.ReactNode }) {
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
      if (!data || effectiveRoleOf(data.role, imp) !== "lab") { router.push("/login"); return; }
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
      titleKey="roles.lab"
      subtitle={profile?.full_name}
      navItems={navItems}
      user={profile}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}