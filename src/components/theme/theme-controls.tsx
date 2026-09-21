"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { Moon, Palette, Sun, MonitorCog, Check, Globe } from "lucide-react";
import { useI18n, LANGUAGES } from "@/i18n";
import { useAccent, ACCENTS, type AccentId } from "./theme-provider";

const MODES = [
  { id: "light", icon: Sun },
  { id: "system", icon: MonitorCog },
  { id: "dark", icon: Moon },
] as const;

function Popup({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[998]" onClick={onClose}>
      <div className="absolute inset-0" />
      <div className="relative z-[999]">{children}</div>
    </div>,
    document.body
  );
}

export function ThemeSwitcher({ compact }: { compact?: boolean }) {
  const { setTheme, theme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  const CurrentIcon = mounted ? MODES.find((m) => m.id === theme)?.icon || Sun : Sun;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title={t("theme.label" as never)}
      >
        <CurrentIcon size={15} />
      </button>
      {open && (
        <Popup open={open} onClose={() => setOpen(false)}>
          <div className="absolute right-0 top-full mt-1 rounded-lg border border-border bg-card shadow-xl p-1 z-[999]" onClick={(e) => e.stopPropagation()}>
            {MODES.map(({ id, icon: Icon }) => {
              const active = mounted && theme === id;
              return (
                <button
                  key={id}
                  onClick={() => { setTheme(id); setOpen(false); }}
                  className={`flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={14} />
                  <span>{t(`theme.${id}` as never)}</span>
                </button>
              );
            })}
          </div>
        </Popup>
      )}
    </div>
  );
}

export function AccentSwitcher() {
  const { accent, setAccent } = useAccent();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title="Accent"
      >
        <Palette size={15} />
      </button>
      {open && (
        <Popup open={open} onClose={() => setOpen(false)}>
          <div className="absolute left-0 bottom-full mb-1 rounded-lg border border-border bg-card shadow-xl p-2 z-[999]" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1.5">
              {ACCENTS.map((a) => {
                const active = accent === a.id;
                return (
                  <button
                    key={a.id}
                    title={a.label}
                    onClick={() => { setAccent(a.id as AccentId); setOpen(false); }}
                    className="flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
                    style={{ backgroundColor: a.color }}
                  >
                    {active && <Check size={12} className="text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </Popup>
      )}
    </div>
  );
}

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        title={t("language.label" as never)}
      >
        <Globe size={15} />
      </button>
      {open && (
        <Popup open={open} onClose={() => setOpen(false)}>
          <div className="absolute right-0 top-full mt-1 rounded-lg border border-border bg-card shadow-xl p-1 z-[999]" onClick={(e) => e.stopPropagation()}>
            {LANGUAGES.map((l) => {
              const active = locale === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => { setLocale(l.code); setOpen(false); }}
                  className={`flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{l.nativeName}</span>
                </button>
              );
            })}
          </div>
        </Popup>
      )}
    </div>
  );
}
