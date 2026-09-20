"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import type { I18nKey } from "@/i18n";
import { LayoutDashboard, Users, UserRound, BedDouble, Package, ScrollText, UserCheck, Activity, HeartPulse, Stethoscope, ClipboardList, FileText, CreditCard, Calendar } from "lucide-react";

const roleNavItems: Record<string, NavItem[]> = {
  super_admin: [
    { href: "/super-admin", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
    { href: "/super-admin/users", labelKey: "superAdmin.allUsers", icon: UserCheck },
    { href: "/super-admin/admins", labelKey: "superAdmin.admins", icon: Users },
    { href: "/super-admin/staff", labelKey: "nav.staff", icon: Users },
    { href: "/super-admin/patients", labelKey: "nav.patients", icon: UserRound },
    { href: "/super-admin/beds", labelKey: "nav.beds", icon: BedDouble },
    { href: "/super-admin/inventory", labelKey: "nav.inventory", icon: Package },
    { href: "/super-admin/opd", labelKey: "nav.opd", icon: Activity },
    { href: "/super-admin/audit", labelKey: "nav.auditLogs", icon: ScrollText },
  ],
  admin: [
    { href: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/users", labelKey: "adminUsers.title", icon: UserCheck },
    { href: "/admin/staff", labelKey: "nav.staff", icon: Users },
    { href: "/admin/patients", labelKey: "nav.patients", icon: UserRound },
    { href: "/admin/beds", labelKey: "nav.beds", icon: BedDouble },
    { href: "/admin/inventory", labelKey: "nav.inventory", icon: Package },
    { href: "/admin/opd", labelKey: "nav.opd", icon: Activity },
    { href: "/admin/audit", labelKey: "nav.auditLogs", icon: ScrollText },
  ],
  doctor: [
    { href: "/doctor", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
    { href: "/doctor/opd", labelKey: "nav.opdQueue", icon: Stethoscope },
    { href: "/doctor/patients", labelKey: "nav.patients", icon: UserRound },
    { href: "/doctor/prescriptions", labelKey: "nav.newPrescription", icon: ClipboardList },
  ],
  nurse: [
    { href: "/nurse", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
    { href: "/nurse/vitals", labelKey: "nav.recordVitals", icon: HeartPulse },
    { href: "/nurse/beds", labelKey: "nav.bedManagement", icon: BedDouble },
  ],
  lab: [
    { href: "/lab", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
    { href: "/lab/queue", labelKey: "nav.testQueue", icon: ClipboardList },
  ],
  staff: [
    { href: "/staff", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
    { href: "/staff/reception", labelKey: "nav.reception", icon: Activity },
    { href: "/staff/rooms", labelKey: "nav.roomStatus", icon: BedDouble },
  ],
  patient: [
    { href: "/patient", labelKey: "nav.dashboard", icon: LayoutDashboard, exact: true },
    { href: "/patient/appointments", labelKey: "nav.bookAppointment", icon: Calendar },
    { href: "/patient/prescriptions", labelKey: "nav.myPrescriptions", icon: FileText },
    { href: "/patient/reports", labelKey: "nav.labReports", icon: ClipboardList },
    { href: "/patient/billing", labelKey: "nav.billing", icon: CreditCard },
  ],
};

const roleTitles: Record<string, string> = {
  super_admin: "roles.superAdmin",
  admin: "roles.admin",
  doctor: "roles.doctor",
  nurse: "roles.nurse",
  lab: "roles.lab",
  staff: "roles.staff",
  patient: "roles.patient",
};

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

  const navItems = roleNavItems[profile.role] || roleNavItems.patient;
  const titleKey = (roleTitles[profile.role] || "roles.patient") as I18nKey;

  return (
    <AppShell titleKey={titleKey} subtitle={profile.full_name} navItems={navItems} user={profile} onLogout={handleLogout}>
      {children}
    </AppShell>
  );
}
