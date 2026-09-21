"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, Download, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";

interface QRShareProps {
  url?: string;
  size?: "sm" | "md";
}

export function QRShare({ url, size = "sm" }: QRShareProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const baseUrl = url || (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => {
    if (open && baseUrl) {
      QRCode.toDataURL(baseUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).then((dataUrl) => setQrDataUrl(dataUrl));
    }
  }, [open, baseUrl]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(baseUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${Date.now()}.png`;
    a.click();
  }

  const btnClass = size === "sm"
    ? "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    : "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors";

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnClass} title="Share QR">
        <QrCode size={size === "sm" ? 15 : 17} />
      </button>

      <Modal open={open} onOpenChange={() => setOpen(false)} title="Share via QR Code">
        <div className="flex flex-col items-center gap-3 py-2 max-h-[70vh] overflow-y-auto">
          {qrDataUrl ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <img src={qrDataUrl} alt="QR Code" width={180} height={180} className="block" />
            </div>
          ) : (
            <div className="flex h-[210px] w-[210px] items-center justify-center rounded-xl border bg-muted/30">
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
      </Modal>
    </>
  );
}
