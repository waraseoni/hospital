import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function genPoNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PO-${date}-${rand}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { supplier_id, notes = "", items } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items[] required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const poNumber = genPoNumber();

    const total = items.reduce((sum: number, it: { quantity: number; unit_price: number }) => {
      return sum + Number(it.quantity || 0) * Number(it.unit_price || 0);
    }, 0);

    const { data: po, error: poErr } = await admin.from("purchase_orders").insert({
      po_number: poNumber,
      supplier_id: supplier_id || null,
      status: "ordered",
      total_amount: total,
      notes,
      ordered_by: user.id,
    }).select().single();

    if (poErr) return NextResponse.json({ error: poErr.message }, { status: 400 });

    const itemRows = items.map((it: { item_id: string; quantity: number; unit_price: number }) => ({
      po_id: po.id,
      item_id: it.item_id,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price || 0),
    }));

    const { error: itemsErr } = await admin.from("purchase_order_items").insert(itemRows);
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 });

    return NextResponse.json({ success: true, po });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("purchase_orders")
      .select("*, supplier:suppliers(*), items:purchase_order_items(*, item:inventory_items(*))")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ purchase_orders: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
