import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prescription_id, items } = await request.json();

    if (!prescription_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "prescription_id and items[] required" }, { status: 400 });
    }

    const admin = createAdminClient();

    for (const line of items) {
      const { inventory_item_id, quantity } = line;
      if (!inventory_item_id || !quantity || quantity <= 0) {
        return NextResponse.json({ error: "Each item needs inventory_item_id and quantity > 0" }, { status: 400 });
      }

      const { data: item } = await admin
        .from("inventory_items")
        .select("id, quantity")
        .eq("id", inventory_item_id)
        .single();

      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      if (item.quantity < quantity) {
        return NextResponse.json({ error: `Insufficient stock for item` }, { status: 400 });
      }
    }

    const results = [];
    for (const line of items) {
      const qty = Number(line.quantity);
      const { data: item } = await admin
        .from("inventory_items")
        .select("id, quantity")
        .eq("id", line.inventory_item_id)
        .single();
      if (!item || item.quantity < qty) {
        return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
      }

      const { error: updErr } = await admin
        .from("inventory_items")
        .update({ quantity: item.quantity - qty })
        .eq("id", line.inventory_item_id)
        .eq("quantity", item.quantity);
      if (updErr) return NextResponse.json({ error: "Stock update failed" }, { status: 409 });

      const { data: txn, error: txnErr } = await admin.from("stock_transactions").insert({
        item_id: line.inventory_item_id,
        type: "out",
        quantity: qty,
        ref_type: "dispense",
        ref_id: prescription_id,
        notes: line.notes || "Prescription dispense",
        created_by: user.id,
      }).select().single();

      if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 400 });
      results.push(txn);
    }

    return NextResponse.json({ success: true, transactions: results });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
