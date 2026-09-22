import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const [eq, logs] = await Promise.all([
      admin.from("equipment").select("*").order("name"),
      admin.from("maintenance_logs").select("*, equipment:equipment(name, asset_tag)").order("performed_at", { ascending: false }).limit(50),
    ]);

    return NextResponse.json({ equipment: eq.data || [], logs: logs.data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { kind = "equipment" } = body;

    const admin = createAdminClient();

    if (kind === "log") {
      const { equipment_id, maintenance_type = "service", description, cost = 0, performed_by = "", performed_at, next_due = null } = body;
      if (!equipment_id || !description) return NextResponse.json({ error: "equipment_id and description required" }, { status: 400 });
      const { data, error } = await admin.from("maintenance_logs").insert({
        equipment_id, maintenance_type, description, cost, performed_by,
        performed_at: performed_at || new Date().toISOString().split("T")[0],
        next_due, created_by: user.id,
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      await admin.from("equipment").update({
        last_service_at: performed_at || new Date().toISOString().split("T")[0],
        next_service_at: next_due,
        status: maintenance_type === "repair" ? "maintenance" : "operational",
      }).eq("id", equipment_id);
      return NextResponse.json({ success: true, log: data });
    }

    const { name, category = "general", department = "", asset_tag, manufacturer = "", model = "", serial_number = "", purchase_date = null, purchase_cost = 0, warranty_until = null, location = "", status = "operational", notes = "" } = body;
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const { data, error } = await admin.from("equipment").insert({
      name, category, department, asset_tag: asset_tag || null, manufacturer, model, serial_number,
      purchase_date, purchase_cost, warranty_until, location, status, notes,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, equipment: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const allowed = ["name", "category", "department", "asset_tag", "manufacturer", "model", "serial_number", "purchase_date", "purchase_cost", "warranty_until", "location", "status", "notes", "last_service_at", "next_service_at"];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (rest[k] !== undefined) update[k] = rest[k];

    const admin = createAdminClient();
    const { data, error } = await admin.from("equipment").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, equipment: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
