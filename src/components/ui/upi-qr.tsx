"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X } from "lucide-react";

interface UpiQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId?: string;
  amount: number;
}

export function UpiQrModal({ open, onOpenChange, invoiceId, amount }: UpiQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [upiUri, setUpiUri] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (invoiceId) params.set("invoice_id", invoiceId);
    params.set("amount", String(amount));
    fetch(`/api/upi?${params.toString()}`)
      .then(r => r.json())
      .then(async data => {
        if (data.upi_uri) {
          setUpiUri(data.upi_uri);
          setUpiId(data.upi_id);
          const url = await QRCode.toDataURL(data.upi_uri, {
            width: 200,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          setQrDataUrl(url);
        } else {
          setUpiUri("");
          setUpiId("");
          setQrDataUrl("");
        }
      })
      .catch(() => setQrDataUrl(""))
      .finally(() => setLoading(false));
  }, [open, invoiceId, amount]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div className="w-full max-w-sm animate-in zoom-in-95 fade-in rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold flex items-center gap-2"><QrCode size={15} /> UPI Payment</h3>
          <button onClick={() => onOpenChange(false)} className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X size={15} />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 px-4 py-5">
          {loading ? (
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border bg-muted/30 text-xs text-muted-foreground">
              Generating...
            </div>
          ) : qrDataUrl ? (
            <div className="rounded-xl border bg-white p-3 shadow-sm">
              <img src={qrDataUrl} alt="UPI QR" width={180} height={180} className="block" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              UPI ID not configured in settings
            </div>
          )}
          <div className="w-full rounded-lg bg-muted/40 px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Amount</p>
            <p className="text-lg font-bold">₹{amount.toFixed(2)}</p>
            {upiId && <p className="text-xs text-muted-foreground mt-1">{upiId}</p>}
          </div>
          {upiUri && (
            <a
              href={upiUri}
              className="w-full rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Open UPI App
            </a>
          )}
          <p className="text-[10px] text-muted-foreground text-center">
            Free UPI Intent QR — no gateway fees. Confirm payment manually after collection.
          </p>
        </div>
      </div>
    </div>
  );
}
