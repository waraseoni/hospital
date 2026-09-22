import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { item_id, type, quantity, ref_type = "manual", ref_id = null, notes = "" } = await request.json();

    if (!item_id || !type || !["in", "out"].includes(type) || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "item_id, type (in|out), quantity > 0 required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: item, error: itemErr } = await admin
      .from("inventory_items")
      .select("id, quantity")
      .eq("id", item_id)
      .single();

    if (itemErr || !item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const qty = Number(quantity);
    if (type === "out" && item.quantity < qty) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
    }

    const delta = type === "in" ? qty : -qty;
    const { error: updErr } = await admin
      .from("inventory_items")
      .update({ quantity: item.quantity + delta })
      .eq("id", item_id)
      .eq("quantity", item.quantity);

    if (updErr) return NextResponse.json({ error: "Stock update failed" }, { status: 409 });

    const { data: txn, error: txnErr } = await admin.from("stock_transactions").insert({
      item_id,
      type,
      quantity: qty,
      ref_type,
      ref_id,
      notes,
      created_by: user.id,
    }).select().single();

    if (txnErr) return NextResponse.json({ error: txnErr.message }, { status: 400 });

    return NextResponse.json({ success: true, transaction: txn, new_quantity: item.quantity + delta });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
