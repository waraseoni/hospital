"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export const ACCENTS = [
  { id: "teal", label: "Teal", color: "#0f766e" },
  { id: "emerald", label: "Green", color: "#059669" },
  { id: "sky", label: "Blue", color: "#0284c7" },
  { id: "violet", label: "Violet", color: "#7c3aed" },
  { id: "rose", label: "Rose", color: "#e11d48" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

interface AccentContextValue {
  accent: AccentId;
  setAccent: (id: AccentId) => void;
}

const AccentContext = createContext<AccentContextValue | null>(null);

export function useAccent(): AccentContextValue {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used within <ThemeProvider>");
  return ctx;
}

function readStoredAccent(): AccentId {
  if (typeof window === "undefined") return "teal";
  try {
    const stored =
      window.localStorage.getItem("hms_accent") ?? "teal";
    const match = ACCENTS.find((a) => a.id === stored);
    return match ? match.id : "teal";
  } catch {
    return "teal";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>("teal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredAccent();
    if (stored !== "teal") {
      setAccentState(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.accent = accent;
    try {
      window.localStorage.setItem("hms_accent", accent);
    } catch {
      // ignore storage errors
    }
  }, [accent, mounted]);

  const setAccent = useCallback((id: AccentId) => setAccentState(id), []);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    </AccentContext.Provider>
  );
}