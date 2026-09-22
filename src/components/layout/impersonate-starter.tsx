"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const REASONS = ["Support", "Data correction", "Audit / review", "Testing", "Other"];

export interface ImpersonateStarterProps {
  userId: string;
  role: string;
  disabled?: boolean;
  onDone?: () => void;
  children?: React.ReactNode;
}

export function ImpersonateStarter({ userId, role, disabled, onDone }: ImpersonateStarterProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Support");
  const [other, setOther] = useState("");
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: userId,
          reason: reason === "Other" ? other || "Other" : reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start impersonation");
      addToast("success", `Now viewing as ${data.impersonating?.role ?? role}`);
      setOpen(false);
      onDone?.();
      router.push(data.redirectTo);
      router.refresh();
    } catch (err: unknown) {
      addToast("error", (err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={`View as ${role}`}
        className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
      >
        <Eye size={14} />
      </button>

      <Modal open={open} onOpenChange={() => !starting && setOpen(false)} title="Start impersonation" footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={starting}>Cancel</Button>
          <Button onClick={handleStart} disabled={starting || (reason === "Other" && !other.trim())}>
            {starting ? "Starting..." : "Start"}
          </Button>
        </>
      }>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            You are about to view this account as <strong className="capitalize">{role}</strong>. All actions will be audited.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {reason === "Other" && (
              <input
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="Describe reason..."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}