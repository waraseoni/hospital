"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  LogOut,
  Lock,
  LockOpen,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { fetchImpersonation, type ImpersonationState } from "@/lib/auth/impersonation-client";

const ALL_SWITCHABLE_ROLES = ["admin", "doctor", "nurse", "lab", "staff", "patient"];

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ImpersonationBanner() {
  const router = useRouter();
  const { addToast } = useToast();
  const [state, setState] = useState<ImpersonationState | null>(null);
  const [exiting, setExiting] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const lastFetchedAt = useRef<number>(0);

  const refreshState = useCallback(async () => {
    lastFetchedAt.current = Date.now();
    const imp = await fetchImpersonation();
    setState(imp);
    if (imp.active && imp.expiresAt) {
      setRemainingMs(imp.expiresAt - Date.now());
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (!state?.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.active]);

  useEffect(() => {
    if (!state?.active) return;
    const id = setInterval(() => {
      const now = Date.now();
      const diff = lastFetchedAt.current + 30 * 60 * 1000 - now;
      setRemainingMs(diff);
      if (diff <= 0) {
        clearInterval(id);
        handleExit(true);
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.active]);

  async function handleExit(expired = false) {
    if (exiting) return;
    setExiting(true);
    try {
      const res = await fetch("/api/admin/impersonate", { method: "DELETE" });
      const data = res.ok ? await res.json() : null;
      setState(null);
      addToast(expired ? "info" : "success", expired ? "Impersonation session expired" : "Impersonation ended");
      router.refresh();
      router.push(data?.redirectTo || "/super-admin");
    } finally {
      setExiting(false);
    }
  }

  async function handleSwitchRole(role: string) {
    if (switching) return;
    setSwitching(true);
    setMenuOpen(false);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole: role, reason: "switch" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to switch");
      addToast("success", `Switched to ${role} view`);
      router.push(data.redirectTo);
      router.refresh();
    } catch (err: unknown) {
      addToast("error", (err as Error).message);
    } finally {
      setSwitching(false);
    }
  }

  async function handleToggleMode() {
    if (!state?.active) return;
    const next = state.mode === "ro" ? "rw" : "ro";
    const res = await fetch("/api/admin/impersonate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    if (!res.ok) {
      addToast("error", "Failed to toggle read-only mode");
      return;
    }
    addToast("success", next === "ro" ? "Read-only mode ON — mutations blocked" : "Read-write mode ON");
    setState((s) => (s ? { ...s, mode: next } : s));
  }

  if (!state?.active) return null;

  const remaining = remainingMs ?? 30 * 60 * 1000;

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-amber-500/40 bg-amber-500/15 px-3 py-1.5 backdrop-blur-md dark:bg-amber-500/10 sm:px-5">
      <div className="flex min-w-0 items-center gap-2 text-amber-800 dark:text-amber-400">
        <Eye size={14} className="shrink-0" />
        <p className="truncate text-xs font-semibold">
          Impersonating <span className="capitalize">{state.role}</span> view
          {state.targetName ? (
            <span className="font-normal"> — {state.targetName}{state.targetEmail ? ` (${state.targetEmail})` : ""}</span>
          ) : null}
          <span className="font-normal"> · as {state.realName || "super admin"}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {state.mode === "ro" && (
          <span className="hidden items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-400 sm:inline-flex">
            <Lock size={10} /> Read-only
          </span>
        )}

        <span className="hidden items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 tabular-nums dark:text-amber-400 md:inline-flex">
          <ShieldAlert size={10} /> {formatRemaining(remaining)}
        </span>

        {state.mode === "ro" && (
          <button
            onClick={handleToggleMode}
            title="Switch to read-write"
            className="flex h-6 items-center gap-1 rounded border border-amber-500/40 px-1.5 text-[10px] font-medium text-amber-800 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
          >
            <LockOpen size={11} /> RW
          </button>
        )}
        {state.mode !== "ro" && (
          <button
            onClick={handleToggleMode}
            title="Read-only mode (block mutations)"
            className="flex h-6 items-center gap-1 rounded border border-amber-500/40 px-1.5 text-[10px] font-medium text-amber-800 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
          >
            <Lock size={11} /> RO
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={switching}
            title="Switch to another role"
            className="flex h-6 items-center gap-1 rounded border border-amber-500/40 px-1.5 text-[10px] font-medium text-amber-800 transition-colors hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-400"
          >
            <UserRound size={11} /> Switch
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-card py-1 shadow-xl">
                {ALL_SWITCHABLE_ROLES.filter((r) => r !== state.role).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSwitchRole(r)}
                    disabled={switching}
                    className="block w-full px-3 py-1.5 text-left text-xs capitalize text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => handleExit(false)}
          disabled={exiting}
          className="flex h-6 shrink-0 items-center gap-1 rounded border border-amber-500/40 bg-transparent px-2 text-[10px] font-semibold text-amber-800 transition-colors hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-400"
        >
          <LogOut size={11} />
          {exiting ? "Exiting..." : "Exit"}
        </button>
      </div>
    </div>
  );
}