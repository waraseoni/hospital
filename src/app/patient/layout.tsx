"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { LayoutDashboard, Calendar, Heart, FileText, CreditCard, FolderOpen, HeartPulse, MessageSquare } from "lucide-react";

const navItems: NavItem[] = [
  { href: "/patient", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/patient/appointments", labelKey: "nav.bookAppointment", icon: Calendar },
  { href: "/patient/prescriptions", labelKey: "nav.myPrescriptions", icon: Heart },
  { href: "/patient/reports", labelKey: "nav.labReports", icon: FileText },
  { href: "/patient/documents", labelKey: "nav.myDocuments", icon: FolderOpen },
  { href: "/patient/vitals", labelKey: "nav.myVitals", icon: HeartPulse },
  { href: "/patient/billing", labelKey: "nav.billing", icon: CreditCard },
  { href: "/patient/feedback", labelKey: "nav.feedback", icon: MessageSquare },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data || data.role !== "patient") { router.push("/login"); return; }
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
      titleKey="roles.patient"
      subtitle={profile?.full_name}
      navItems={navItems}
      user={profile}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}