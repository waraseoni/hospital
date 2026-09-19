"use client";

import { ToastContainer } from "@/components/ui/toast";
import { useToast } from "@/components/ui/toast";

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, dismissToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
