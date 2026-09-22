import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function genCallNumber() {
  const d = new Date();
  const date = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AMB-${date}-${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const kind = request.nextUrl.searchParams.get("kind") || "ambulances";

    if (kind === "calls") {
      const { data, error } = await admin
        .from("ambulance_calls")
        .select("*, ambulance:ambulances(vehicle_no, driver_name, driver_phone), patient:patients(name, uhid)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ calls: data || [] });
    }

    const { data, error } = await admin.from("ambulances").select("*").order("vehicle_no");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ambulances: data || [] });
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
    const { kind = "ambulance" } = body;
    const admin = createAdminClient();

    if (kind === "call") {
      const { patient_id = null, patient_name = "", patient_phone = "", pickup_address, drop_address = "", condition_notes = "", trip_type = "emergency" } = body;
      if (!pickup_address) return NextResponse.json({ error: "pickup_address required" }, { status: 400 });
      const { data, error } = await admin.from("ambulance_calls").insert({
        call_number: genCallNumber(),
        patient_id, patient_name, patient_phone, pickup_address, drop_address, condition_notes, trip_type,
        status: "received",
      }).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, call: data });
    }

    const { vehicle_no, ambulance_type = "BLS", driver_name = "", driver_phone = "", base_location = "", notes = "" } = body;
    if (!vehicle_no) return NextResponse.json({ error: "vehicle_no required" }, { status: 400 });

    const { data, error } = await admin.from("ambulances").insert({
      vehicle_no, ambulance_type, driver_name, driver_phone, base_location, notes,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, ambulance: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { kind = "call", id, action, ambulance_id } = body;
    if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });

    const admin = createAdminClient();

    if (kind === "vehicle") {
      const { data, error } = await admin.from("ambulances").update({ status: action }).eq("id", id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true, ambulance: data });
    }

    const { data: call } = await admin.from("ambulance_calls").select("*").eq("id", id).single();
    if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });

    let update: Record<string, unknown> = {};

    if (action === "assign") {
      if (!ambulance_id) return NextResponse.json({ error: "ambulance_id required" }, { status: 400 });
      update = { status: "assigned", ambulance_id, assigned_by: user.id };
      await admin.from("ambulances").update({ status: "on_trip" }).eq("id", ambulance_id);
    } else if (action === "start") {
      update = { status: "en_route", started_at: new Date().toISOString() };
    } else if (action === "arrive") {
      update = { status: "arrived", arrived_at: new Date().toISOString() };
    } else if (action === "complete") {
      update = { status: "completed", completed_at: new Date().toISOString() };
      if (call.ambulance_id) {
        await admin.from("ambulances").update({ status: "available" }).eq("id", call.ambulance_id);
      }
    } else if (action === "cancel") {
      update = { status: "cancelled" };
      if (call.ambulance_id) {
        await admin.from("ambulances").update({ status: "available" }).eq("id", call.ambulance_id);
      }
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data, error } = await admin.from("ambulance_calls").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, call: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
