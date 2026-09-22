"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { InventoryItem, Patient } from "@/types/database";
import { useI18n } from "@/i18n/provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, PageContainer } from "@/components/ui/page";
import { Trash2, Search, ShoppingCart } from "lucide-react";

interface CartLine {
  inventory_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  max_qty: number;
}

export default function PharmacyPOSPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [patientId, setPatientId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [selling, setSelling] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [inv, pat] = await Promise.all([
        supabase.from("inventory_items").select("*").order("name"),
        supabase.from("patients").select("*").order("name").limit(200),
      ]);
      setItems((inv.data as InventoryItem[]) || []);
      setPatients((pat.data as Patient[]) || []);
      const { data: settings } = await supabase.from("settings").select("tax_rate").limit(1).single();
      if (settings?.tax_rate) setTaxRate(String(settings.tax_rate));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(item: InventoryItem) {
    if (item.quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(c => c.inventory_item_id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          addToast("error", t("pharmacy.insufficientStock"));
          return prev;
        }
        return prev.map(c => c.inventory_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { inventory_item_id: item.id, name: item.name, unit_price: item.price_per_unit, quantity: 1, max_qty: item.quantity }];
    });
  }

  function updateQty(id: string, qty: number) {
    setCart(prev => prev.map(c => c.inventory_item_id === id ? { ...c, quantity: Math.max(1, Math.min(qty, c.max_qty)) } : c));
  }

  function removeLine(id: string) {
    setCart(prev => prev.filter(c => c.inventory_item_id !== id));
  }

  const subtotal = cart.reduce((s, c) => s + c.unit_price * c.quantity, 0);
  const discountAmt = subtotal * (parseFloat(discount) || 0) / 100;
  const taxable = subtotal - discountAmt;
  const taxAmt = taxable * (parseFloat(taxRate) || 0) / 100;
  const net = taxable + taxAmt;

  async function handleCheckout() {
    if (!patientId || cart.length === 0) return;
    setSelling(true);
    try {
      const res = await fetch("/api/pharmacy/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          items: cart.map(c => ({
            inventory_item_id: c.inventory_item_id,
            name: c.name,
            unit_price: c.unit_price,
            quantity: c.quantity,
          })),
          discount: parseFloat(discount) || 0,
          tax: parseFloat(taxRate) || 0,
          payment_method: paymentMethod,
          payment_status: "paid",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pharmacy.saleFailed"));

      setLastInvoiceId(data.invoice.id);
      addToast("success", t("pharmacy.saleSuccess"));

      await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: data.invoice.id }),
      }).catch(() => null);

      setCart([]);
      setPatientId("");
      setSearch("");
      const supabase = createClient();
      const { data: inv } = await supabase.from("inventory_items").select("*").order("name");
      setItems((inv as InventoryItem[]) || []);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSelling(false);
    }
  }

  if (loading) return <PageContainer><Skeleton lines={8} /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader title={t("pharmacy.posTitle")} subtitle={t("pharmacy.posSubtitle")} />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("pharmacy.searchMedicines")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="rounded-xl border border-border bg-card max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">{t("inventory.itemName")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("inventory.unitPrice")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("inventory.qty")}</th>
                  <th className="px-3 py-2 text-left font-medium">{t("common.status")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2">₹{item.price_per_unit}</td>
                    <td className="px-3 py-2">{item.quantity} {item.unit}</td>
                    <td className="px-3 py-2">
                      <Badge variant={item.quantity <= 0 ? "destructive" : item.quantity <= item.minimum_stock ? "warning" : "success"}>
                        {item.quantity <= 0 ? t("pharmacy.outOfStock") : item.quantity <= item.minimum_stock ? t("inventory.lowStock") : t("inventory.inStock")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant="outline" disabled={item.quantity <= 0} onClick={() => addToCart(item)}>
                        {t("pharmacy.add")}
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{t("inventory.noItems")}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart size={16} /> {t("pharmacy.cart")}
              <Badge variant="outline">{cart.length}</Badge>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium">{t("pharmacy.selectPatient")}</label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("pharmacy.walkIn")}</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>
                ))}
              </select>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t("pharmacy.cartEmpty")}</p>
            ) : (
              <div className="space-y-2">
                {cart.map(line => (
                  <div key={line.inventory_item_id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{line.name}</p>
                      <p className="text-xs text-muted-foreground">₹{line.unit_price} × {line.quantity}</p>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={line.max_qty}
                      value={line.quantity}
                      onChange={(e) => updateQty(line.inventory_item_id, Number(e.target.value))}
                      className="w-14 rounded border border-input bg-background px-1 py-0.5 text-xs text-center"
                    />
                    <button onClick={() => removeLine(line.inventory_item_id)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Input type="number" min={0} max={100} label={t("pharmacy.discount")} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <Input type="number" min={0} max={100} label={t("pharmacy.tax")} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </div>

            <div className="space-y-1 text-sm border-t border-border pt-2">
              <div className="flex justify-between"><span>{t("pharmacy.subtotal")}</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>{t("pharmacy.discount")}</span><span>-₹{discountAmt.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>{t("pharmacy.tax")}</span><span>₹{taxAmt.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base pt-1"><span>{t("pharmacy.total")}</span><span>₹{net.toFixed(2)}</span></div>
            </div>

            <div className="flex gap-2">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
              <Button onClick={handleCheckout} disabled={selling || !patientId || cart.length === 0}>
                {selling ? t("common.saving") : t("pharmacy.checkout")}
              </Button>
            </div>

            {lastInvoiceId && (
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const res = await fetch("/api/invoices", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ invoice_id: lastInvoiceId }),
                  });
                  const data = await res.json();
                  if (data.pdf_url) window.open(data.pdf_url, "_blank");
                }}
              >
                {t("pharmacy.printReceipt")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
