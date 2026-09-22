"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchImpersonation, type ImpersonationState } from "@/lib/auth/impersonation-client";

export function ImpersonationBanner() {
  const router = useRouter();
  const [state, setState] = useState<ImpersonationState | null>(null);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchImpersonation().then((imp) => {
      if (!cancelled && imp.active) setState(imp);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExit() {
    setExiting(true);
    try {
      const res = await fetch("/api/admin/impersonate", { method: "DELETE" });
      const data = res.ok ? await res.json() : null;
      setState(null);
      router.push(data?.redirectTo || "/super-admin");
      router.refresh();
    } finally {
      setExiting(false);
    }
  }

  if (!state?.active) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-3 py-1.5 backdrop-blur-md sm:px-5">
      <div className="flex min-w-0 items-center gap-2 text-amber-700 dark:text-amber-400">
        <Eye size={14} className="shrink-0" />
        <p className="truncate text-xs font-semibold">
          Impersonating <span className="capitalize">{state.role}</span> view
          {state.realName ? (
            <span className="font-normal"> — as super admin {state.realName}</span>
          ) : null}
        </p>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleExit}
        disabled={exiting}
        className="h-7 shrink-0 border-amber-500/40 bg-transparent px-2.5 text-xs text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
      >
        <LogOut size={12} className="mr-1" />
        {exiting ? "Exiting..." : "Exit"}
      </Button>
    </div>
  );
}
