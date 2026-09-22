import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { action, items } = await request.json();

    if (!["approve", "reject", "issue"].includes(action)) {
      return NextResponse.json({ error: "action must be approve|reject|issue" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: req, error: reqErr } = await admin
      .from("requisitions")
      .select("*, items:requisition_items(*)")
      .eq("id", id)
      .single();

    if (reqErr || !req) return NextResponse.json({ error: "Requisition not found" }, { status: 404 });
    if (req.status === "issued" || req.status === "rejected") {
      return NextResponse.json({ error: "Requisition already closed" }, { status: 400 });
    }

    if (action === "approve") {
      const { error } = await admin.from("requisitions").update({ status: "approved", approved_by: user.id }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, status: "approved" });
    }

    if (action === "reject") {
      const { error } = await admin.from("requisitions").update({ status: "rejected", approved_by: user.id }).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, status: "rejected" });
    }

    if (req.status !== "approved") {
      return NextResponse.json({ error: "Must approve before issue" }, { status: 400 });
    }

    const issueLines = Array.isArray(items) && items.length > 0 ? items : (req.items || []).map((line: { id: string; item_id: string; quantity: number }) => ({
      requisition_item_id: line.id,
      item_id: line.item_id,
      quantity: line.quantity,
    }));

    for (const line of issueLines) {
      const qty = Number(line.quantity);
      if (!line.item_id || !qty || qty <= 0) continue;

      const { data: item } = await admin.from("inventory_items").select("id, quantity").eq("id", line.item_id).single();
      if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      if (item.quantity < qty) return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });

      const { error: updErr } = await admin
        .from("inventory_items")
        .update({ quantity: item.quantity - qty })
        .eq("id", line.item_id)
        .eq("quantity", item.quantity);
      if (updErr) return NextResponse.json({ error: "Stock update failed" }, { status: 409 });

      await admin.from("stock_transactions").insert({
        item_id: line.item_id,
        type: "out",
        quantity: qty,
        ref_type: "requisition",
        ref_id: req.id,
        notes: `Requisition ${req.req_number} issue`,
        created_by: user.id,
      });

      if (line.requisition_item_id) {
        await admin.from("requisition_items").update({ issued_qty: qty }).eq("id", line.requisition_item_id);
      }
    }

    const { error: closeErr } = await admin.from("requisitions").update({
      status: "issued",
      issued_at: new Date().toISOString(),
    }).eq("id", id);

    if (closeErr) return NextResponse.json({ error: closeErr.message }, { status: 400 });

    return NextResponse.json({ success: true, status: "issued" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
