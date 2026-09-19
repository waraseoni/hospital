"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Invoice, InvoiceLineItem, Patient } from "@/types/database";

interface LineItemDraft {
  description: string;
  category: InvoiceLineItem["category"];
  amount: string;
  quantity: string;
}

export default function StaffDashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({ dirtyBeds: 0, totalBeds: 0 });
  const [loading, setLoading] = useState(true);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([{ description: "", category: "other", amount: "", quantity: "1" }]);
  const [taxRate, setTaxRate] = useState("18");
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const supabase = createClient();
    const [patientsRes, invoicesRes, allBeds, readyBeds] = await Promise.all([
      supabase.from("patients").select("*").order("name"),
      supabase.from("invoices").select("*, patient:patients(name, uhid)").order("created_at", { ascending: false }).limit(20),
      supabase.from("beds").select("id", { count: "exact", head: true }),
      supabase.from("beds").select("id", { count: "exact", head: true }).eq("is_ready", true),
    ]);
    setPatients((patientsRes.data as Patient[]) || []);
    setInvoices((invoicesRes.data as Invoice[]) || []);
    setStats({
      dirtyBeds: (allBeds.count || 0) - (readyBeds.count || 0),
      totalBeds: allBeds.count || 0,
    });
    setLoading(false);
  }

  function addLineItem() {
    setLineItems([...lineItems, { description: "", category: "other", amount: "", quantity: "1" }]);
  }

  function updateLineItem(index: number, field: keyof LineItemDraft, value: string) {
    const updated = [...lineItems];
    if (field === "category") {
      updated[index].category = value as InvoiceLineItem["category"];
    } else if (field === "description") {
      updated[index].description = value;
    } else if (field === "amount") {
      updated[index].amount = value;
    } else if (field === "quantity") {
      updated[index].quantity = value;
    }
    setLineItems(updated);
  }

  function removeLineItem(index: number) {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  function calcSubtotal() {
    return lineItems.reduce((sum, item) => {
      const amt = parseFloat(item.amount) || 0;
      const qty = parseInt(item.quantity) || 1;
      return sum + amt * qty;
    }, 0);
  }

  const subtotal = calcSubtotal();
  const taxAmt = subtotal * (parseFloat(taxRate) || 0) / 100;
  const net = subtotal + taxAmt;

  function genInvoiceNumber() {
    const d = new Date();
    const date = d.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `INV-${date}-${rand}`;
  }

  async function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId || subtotal <= 0) return;
    setCreating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const items: InvoiceLineItem[] = lineItems
      .filter(li => li.description.trim())
      .map(li => ({
        description: li.description.trim(),
        category: li.category,
        amount: parseFloat(li.amount) || 0,
        quantity: parseInt(li.quantity) || 1,
      }));

    await supabase.from("invoices").insert({
      patient_id: selectedPatientId,
      invoice_number: genInvoiceNumber(),
      line_items: items,
      total_amount: subtotal,
      discount: 0,
      tax: taxAmt,
      net_amount: net,
      payment_status: "pending",
      created_by: user?.id || null,
    });

    setSelectedPatientId("");
    setLineItems([{ description: "", category: "other", amount: "", quantity: "1" }]);
    setCreating(false);
    loadAll();
  }

  async function markPaid(id: string) {
    if (!window.confirm("Mark this invoice as paid?")) return;
    const supabase = createClient();
    await supabase.from("invoices").update({ payment_status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    loadAll();
  }

  const statusColor: Record<string, string> = {
    pending: "text-orange-600",
    paid: "text-green-600",
    partial: "text-blue-600",
    cancelled: "text-muted-foreground",
  };

  if (loading) return <div className="animate-pulse text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Staff Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Beds Need Cleaning</p>
          <p className="text-3xl font-bold mt-1 text-red-600">{stats.dirtyBeds}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Beds</p>
          <p className="text-3xl font-bold mt-1 text-blue-600">{stats.totalBeds}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Create Invoice</h2>
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Patient *</label>
            <select value={selectedPatientId} onChange={(e) => setSelectedPatientId(e.target.value)} required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select patient...</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.uhid})</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {lineItems.map((li, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-4 items-end">
                <input placeholder="Description" value={li.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <select value={li.category} onChange={(e) => updateLineItem(i, "category", e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="opd">OPD</option>
                  <option value="ipd">IPD</option>
                  <option value="lab">Lab</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="other">Other</option>
                </select>
                <input type="number" placeholder="Amount" value={li.amount} onChange={(e) => updateLineItem(i, "amount", e.target.value)} min="0" step="0.01" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                <div className="flex gap-1">
                  <input type="number" placeholder="Qty" value={li.quantity} onChange={(e) => updateLineItem(i, "quantity", e.target.value)} min="1" className="w-16 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeLineItem(i)} className="rounded-lg border border-border px-2 text-destructive hover:bg-destructive/10 text-sm">&times;</button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addLineItem} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20">+ Add Line Item</button>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <label className="font-medium mr-2">Tax %:</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min="0" max="100" className="w-20 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <span>Subtotal: <strong>₹{subtotal.toFixed(2)}</strong></span>
            <span>Tax: <strong>₹{taxAmt.toFixed(2)}</strong></span>
            <span className="font-bold">Total: ₹{net.toFixed(2)}</span>
          </div>

          <button type="submit" disabled={creating || !selectedPatientId || subtotal <= 0} className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {creating ? "Creating..." : "Create Invoice"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Recent Invoices</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 font-medium">Invoice #</th>
                <th className="pb-2 font-medium">Patient</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-border/50">
                  <td className="py-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="py-3">{(inv.patient as Patient)?.name || "—"}</td>
                  <td className="py-3">₹{inv.net_amount.toFixed(2)}</td>
                  <td className={`py-3 font-medium capitalize ${statusColor[inv.payment_status] || ""}`}>{inv.payment_status}</td>
                  <td className="py-3">
                    {inv.payment_status === "pending" && (
                      <button onClick={() => markPaid(inv.id)} className="rounded-lg bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
