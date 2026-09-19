"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export interface ToastData {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const typeIcons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const typeStyles = {
  success: "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20",
  error: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20",
  info: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20",
};

const iconStyles = {
  success: "text-green-600",
  error: "text-red-600",
  info: "text-blue-600",
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = typeIcons[toast.type];

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4 shadow-lg", typeStyles[toast.type])}>
      <Icon size={20} className={cn("shrink-0", iconStyles[toast.type])} />
      <p className="text-sm flex-1">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="rounded hover:bg-black/5" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (type: ToastData["type"], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, dismissToast };
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastData[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
