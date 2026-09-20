"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils/cn";
import { useI18n, type I18nKey } from "@/i18n";
import {
  LanguageSwitcher,
  ThemeSwitcher,
  AccentSwitcher,
} from "@/components/theme/theme-controls";

export interface NavItem {
  href: string;
  labelKey: I18nKey;
  icon?: LucideIcon;
  exact?: boolean;
}

interface AppShellProps {
  titleKey: I18nKey;
  subtitle?: string;
  navItems: NavItem[];
  user: Profile | null;
  onLogout: () => void;
  children: React.ReactNode;
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({ navItems, pathname, t, onNavClick }: { navItems: NavItem[]; pathname: string; t: (k: I18nKey) => string; onNavClick?: () => void }) {
  return (
    <>
      {navItems.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon ?? LayoutDashboard;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150",
              active
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={17} strokeWidth={active ? 2.2 : 1.8} className={cn("shrink-0 transition-colors", active && "text-primary")} />
            <span className="truncate">{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ titleKey, subtitle, navItems, user, onLogout, children }: AppShellProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[var(--sidebar-w)] shrink-0 flex-col border-r border-border bg-card lg:flex">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-foreground">{t(titleKey)}</p>
            {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          <NavLinks navItems={navItems} pathname={pathname} t={t} />
        </nav>

        {/* Footer */}
        <div className="space-y-2.5 border-t border-border p-3">
          <AccentSwitcher />
          <div className="flex items-center justify-between">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between">
            <p className="min-w-0 truncate text-xs font-medium">{user?.full_name}</p>
            <button onClick={onLogout} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title={t("common.logout")}>
              <LogOut size={14} />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/60">v{process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0.0"}</p>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 lg:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity size={16} />
            </span>
            <span className="text-[13px] font-bold">{t(titleKey)}</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
          <NavLinks navItems={navItems} pathname={pathname} t={t} onNavClick={() => setMobileOpen(false)} />
        </nav>
        <div className="space-y-2.5 border-t border-border p-3">
          <div className="flex items-center justify-between">
            <p className="min-w-0 truncate text-xs font-medium">{user?.full_name}</p>
            <button onClick={onLogout} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
              <LogOut size={14} />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/60">v{process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0.0"}</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-card/80 px-3 backdrop-blur-md lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity size={12} />
            </span>
            <span className="text-xs font-bold">{t(titleKey)}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </header>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md lg:hidden">
          {navItems.slice(0, 5).map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon ?? LayoutDashboard;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.6} />
                <span className="truncate max-w-[56px]">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Page Content */}
        <main className="flex-1 px-3 pb-20 pt-4 sm:px-5 sm:pb-6 sm:pt-5 lg:px-8 lg:pb-8">
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
