"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Activity, LogOut, LayoutDashboard } from "lucide-react";
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

function Brand({ titleKey, subtitle }: { titleKey: I18nKey; subtitle?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Activity size={18} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold text-primary">{t(titleKey)}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function LogoutButton({
  onLogout,
  label,
}: {
  onLogout: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onLogout}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10"
    >
      <LogOut size={15} />
    </button>
  );
}

export function AppShell({
  titleKey,
  subtitle,
  navItems,
  user,
  onLogout,
  children,
}: AppShellProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center border-b border-border px-4">
          <Brand titleKey={titleKey} subtitle={subtitle} />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon ?? LayoutDashboard;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={17} />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 border-t border-border p-4">
          <AccentSwitcher />
          <div className="flex items-center justify-between gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="min-w-0">
              {user && (
                <p className="truncate text-xs font-medium text-foreground">
                  {user.full_name}
                </p>
              )}
            </div>
            <LogoutButton onLogout={onLogout} label={t("common.logout")} />
          </div>
        </div>
      </aside>

      {/* Mobile + content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top header */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between gap-2 px-4">
            <Brand titleKey={titleKey} subtitle={subtitle} />
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
              <LogoutButton onLogout={onLogout} label={t("common.logout")} />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon ?? LayoutDashboard;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={14} />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}