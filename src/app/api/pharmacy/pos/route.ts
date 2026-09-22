import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      patient_id,
      items,
      discount = 0,
      tax = 0,
      payment_method = "cash",
      payment_status = "paid",
    } = body;

    if (!patient_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "patient_id and items[] required" }, { status: 400 });
    }

    const admin = createAdminClient();

    for (const line of items) {
      const { inventory_item_id, quantity } = line;
      if (!inventory_item_id || !quantity || quantity <= 0) {
        return NextResponse.json({ error: "Invalid cart line" }, { status: 400 });
      }
      const { data: item } = await admin.from("inventory_items").select("id, quantity").eq("id", inventory_item_id).single();
      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      if (item.quantity < quantity) return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
    }

    const subtotal = items.reduce((sum: number, it: { unit_price: number; quantity: number }) => {
      return sum + Number(it.unit_price || 0) * Number(it.quantity || 0);
    }, 0);
    const discountAmt = subtotal * (Number(discount) || 0) / 100;
    const taxable = subtotal - discountAmt;
    const taxAmt = taxable * (Number(tax) || 0) / 100;
    const net = taxable + taxAmt;

    const d = new Date();
    const date = d.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `PHM-${date}-${rand}`;

    const lineItems = items.map((it: { name: string; unit_price: number; quantity: number }) => ({
      description: it.name,
      category: "pharmacy" as const,
      amount: Number(it.unit_price || 0) * Number(it.quantity || 0),
      quantity: Number(it.quantity || 1),
    }));

    const { data: invoice, error: invErr } = await admin.from("invoices").insert({
      patient_id,
      invoice_number: invoiceNumber,
      line_items: lineItems,
      total_amount: subtotal,
      discount: discountAmt,
      tax: taxAmt,
      net_amount: net,
      payment_status,
      payment_method,
      notes: "Pharmacy POS",
      created_by: user.id,
    }).select().single();

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 400 });

    for (const line of items) {
      const qty = Number(line.quantity);
      const { data: item } = await admin.from("inventory_items").select("id, quantity").eq("id", line.inventory_item_id).single();
      if (!item || item.quantity < qty) {
        return NextResponse.json({ error: "Insufficient stock", invoice_id: invoice.id }, { status: 400 });
      }

      const { error: updErr } = await admin
        .from("inventory_items")
        .update({ quantity: item.quantity - qty })
        .eq("id", line.inventory_item_id)
        .eq("quantity", item.quantity);
      if (updErr) return NextResponse.json({ error: "Stock update failed", invoice_id: invoice.id }, { status: 409 });

      await admin.from("stock_transactions").insert({
        item_id: line.inventory_item_id,
        type: "out",
        quantity: qty,
        ref_type: "pos",
        ref_id: invoice.id,
        notes: `POS ${invoiceNumber}`,
        created_by: user.id,
      });
    }

    return NextResponse.json({ success: true, invoice });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
