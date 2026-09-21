"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { QrCode, Download, Copy, Check, X } from "lucide-react";

interface QRShareProps {
  url?: string;
  size?: "sm" | "md";
}

export function QRShare({ url, size = "sm" }: QRShareProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  const baseUrl = url || (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open && baseUrl) {
      QRCode.toDataURL(baseUrl, {
        width: 180,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).then((dataUrl) => setQrDataUrl(dataUrl));
    }
  }, [open, baseUrl]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const host = typeof window !== "undefined" ? window.location.hostname : "site";
    const name = host.replace(/\./g, "-");
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${name}.png`;
    a.click();
  }

  const btnClass = size === "sm"
    ? "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    : "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";

  function renderModal() {
    if (!open || !mounted) return null;
    return createPortal(
      <div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <div className="w-full max-w-xs animate-in zoom-in-95 fade-in rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-semibold">Share QR Code</h3>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              <X size={15} />
            </button>
          </div>
          <div className="flex flex-col items-center gap-3 px-4 py-4">
            {qrDataUrl ? (
              <div className="rounded-xl border bg-white p-2 shadow-sm">
                <img src={qrDataUrl} alt="QR Code" width={160} height={160} className="block" />
              </div>
            ) : (
              <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl border bg-muted/30">
                <div className="animate-pulse text-xs text-muted-foreground">Generating...</div>
              </div>
            )}

            <div className="w-full rounded-lg bg-muted/40 px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Scan to open</p>
              <p className="text-xs font-medium text-foreground truncate">{baseUrl}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                <Download size={13} />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnClass} title="Share QR">
        <QrCode size={size === "sm" ? 15 : 17} />
      </button>
      {renderModal()}
    </>
  );
}
