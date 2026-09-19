"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell } from "@/components/layout/app-shell";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data) { router.push("/login"); return; }
      setProfile(data);
    }
    load();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!profile) return null;

  return (
    <AppShell titleKey="nav.profile" subtitle={profile.full_name} navItems={[]} user={profile} onLogout={handleLogout}>
      {children}
    </AppShell>
  );
}
