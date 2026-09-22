import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { action } = await request.json();

    if (!["receive", "cancel"].includes(action)) {
      return NextResponse.json({ error: "action must be receive|cancel" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: po, error: poErr } = await admin
      .from("purchase_orders")
      .select("*, items:purchase_order_items(*)")
      .eq("id", id)
      .single();

    if (poErr || !po) return NextResponse.json({ error: "PO not found" }, { status: 404 });
    if (po.status === "received" || po.status === "cancelled") {
      return NextResponse.json({ error: "PO already closed" }, { status: 400 });
    }

    if (action === "cancel") {
      const { error } = await admin.from("purchase_orders").update({ status: "cancelled" }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, status: "cancelled" });
    }

    for (const line of po.items || []) {
      const { data: item } = await admin.from("inventory_items").select("id, quantity, price_per_unit").eq("id", line.item_id).single();
      if (!item) continue;

      await admin.from("inventory_items").update({
        quantity: item.quantity + line.quantity,
        price_per_unit: line.unit_price > 0 ? line.unit_price : item.price_per_unit,
      }).eq("id", line.item_id);

      await admin.from("stock_transactions").insert({
        item_id: line.item_id,
        type: "in",
        quantity: line.quantity,
        ref_type: "purchase_order",
        ref_id: po.id,
        notes: `PO ${po.po_number} receive`,
        created_by: user.id,
      });

      await admin.from("purchase_order_items").update({ received_qty: line.quantity }).eq("id", line.id);
    }

    const { error: updErr } = await admin.from("purchase_orders").update({
      status: "received",
      received_at: new Date().toISOString(),
    }).eq("id", id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    return NextResponse.json({ success: true, status: "received" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
