import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function genReqNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${date}-${rand}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { department, notes = "", items } = await request.json();

    if (!department || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "department and items[] required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const reqNumber = genReqNumber();

    const { data: req, error: reqErr } = await admin.from("requisitions").insert({
      req_number: reqNumber,
      department,
      requested_by: user.id,
      status: "pending",
      notes,
    }).select().single();

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 });

    const itemRows = items.map((it: { item_id: string; quantity: number }) => ({
      req_id: req.id,
      item_id: it.item_id,
      quantity: Number(it.quantity),
    }));

    const { error: itemsErr } = await admin.from("requisition_items").insert(itemRows);
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 });

    return NextResponse.json({ success: true, requisition: req });
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
      .from("requisitions")
      .select("*, requested_by_profile:profiles!requisitions_requested_by_fkey(full_name, role), items:requisition_items(*, item:inventory_items(*))")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ requisitions: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
