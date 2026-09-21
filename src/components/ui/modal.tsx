"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({ open, onOpenChange, title, children, footer, size = "md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  const sizeClasses = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-xl" };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm overflow-hidden"
      onClick={(e) => { if (e.target === overlayRef.current) onOpenChange(false); }}
    >
      <div className={cn("w-full max-h-[90vh] animate-in zoom-in-95 fade-in rounded-xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col", sizeClasses[size])}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={() => onOpenChange(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={15} />
          </button>
        </div>
        <div className="px-4 py-3 overflow-y-auto min-h-0">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
