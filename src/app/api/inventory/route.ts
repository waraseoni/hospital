import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, category, quantity, unit, price_per_unit, minimum_stock } = await request.json();

    if (!name || !category || quantity === undefined || !unit || price_per_unit === undefined || minimum_stock === undefined) {
      return NextResponse.json({ error: "name, category, quantity, unit, price_per_unit, and minimum_stock are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin.from("inventory_items").insert({
      name,
      category,
      quantity,
      unit,
      price_per_unit,
      minimum_stock,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Inventory item created successfully", item: data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
