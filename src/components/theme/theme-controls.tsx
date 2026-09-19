"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Palette, Sun, MonitorCog, Check } from "lucide-react";
import { useI18n, LANGUAGES } from "@/i18n";
import { useAccent, ACCENTS, type AccentId } from "./theme-provider";

const MODES = [
  { id: "light", icon: Sun },
  { id: "system", icon: MonitorCog },
  { id: "dark", icon: Moon },
] as const;

export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { setTheme, theme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`flex items-center rounded-lg border border-border bg-background p-0.5 ${compact ? "scale-90 origin-right" : ""}`}
    >
      {MODES.map(({ id, icon: Icon }) => {
        const active = mounted && theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            title={t(`theme.${id}` as never)}
            aria-label={t(`theme.${id}` as never)}
            className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}

export function AccentSwitcher() {
  const { accent, setAccent } = useAccent();

  return (
    <div
      role="group"
      aria-label="Accent color"
      className="flex items-center gap-1.5 rounded-lg border border-border bg-background p-1.5"
    >
      <Palette size={14} className="mx-0.5 text-muted-foreground" />
      {ACCENTS.map((a) => {
        const active = accent === a.id;
        return (
          <button
            key={a.id}
            type="button"
            title={a.label}
            aria-label={a.label}
            onClick={() => setAccent(a.id as AccentId)}
            className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
            style={{ backgroundColor: a.color }}
          >
            {active && <Check size={13} className="text-white" />}
          </button>
        );
      })}
    </div>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      aria-label={t("language.label" as never)}
      className="h-9 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.nativeName}
        </option>
      ))}
    </select>
  );
}