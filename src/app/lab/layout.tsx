"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/lab", label: "Dashboard" },
  { href: "/lab/queue", label: "Test Queue" },
];

export default function LabLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data || data.role !== "lab") { router.push("/login"); return; }
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
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-border bg-card p-4">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-primary">Lab Department</h2>
          {profile && <p className="text-xs text-muted-foreground">{profile.full_name}</p>}
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-6 w-full rounded-lg border border-border px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors">
          Logout
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
