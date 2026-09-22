import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, category, quantity, unit, price_per_unit, minimum_stock, supplier, expiry_date, batch_number } = body;

    const admin = createAdminClient();

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category;
    if (unit !== undefined) update.unit = unit;
    if (price_per_unit !== undefined) update.price_per_unit = price_per_unit;
    if (minimum_stock !== undefined) update.minimum_stock = minimum_stock;
    if (supplier !== undefined) update.supplier = supplier || null;
    if (expiry_date !== undefined) update.expiry_date = expiry_date || null;
    if (batch_number !== undefined) update.batch_number = batch_number || null;

    const { error } = await admin.from("inventory_items").update(update).eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Inventory item updated successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const admin = createAdminClient();
    const { error } = await admin.from("inventory_items").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Inventory item deleted successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
