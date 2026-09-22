import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("housekeeping_tasks")
      .select("*, bed:beds(id, ward_name, bed_number), assigned_to_profile:profiles!housekeeping_tasks_assigned_to_fkey(id, full_name, role)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ tasks: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bed_id, room_label, task_type = "regular", priority = "normal", notes = "", assigned_to = null } = await request.json();
    if (!room_label && !bed_id) return NextResponse.json({ error: "room_label or bed_id required" }, { status: 400 });

    let label = room_label;
    let bed = bed_id;
    if (bed_id) {
      const admin0 = createAdminClient();
      const { data: b } = await admin0.from("beds").select("id, ward_name, bed_number").eq("id", bed_id).single();
      if (b) label = label || `${b.ward_name} / ${b.bed_number}`;
    }

    const admin = createAdminClient();
    const { data, error } = await admin.from("housekeeping_tasks").insert({
      bed_id: bed || null,
      room_label: label || "Unknown",
      task_type,
      priority,
      notes,
      assigned_to,
      requested_by: user.id,
      status: assigned_to ? "assigned" : "pending",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, task: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, action, assigned_to } = await request.json();
    if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });

    const admin = createAdminClient();
    const { data: task } = await admin.from("housekeeping_tasks").select("*").eq("id", id).single();
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    let update: Record<string, unknown> = {};

    if (action === "assign") {
      if (!assigned_to) return NextResponse.json({ error: "assigned_to required" }, { status: 400 });
      update = { status: "assigned", assigned_to };
    } else if (action === "start") {
      update = { status: "in_progress", assigned_to: assigned_to || task.assigned_to || user.id };
    } else if (action === "complete") {
      update = { status: "completed", completed_at: new Date().toISOString(), assigned_to: task.assigned_to || user.id };
      if (task.bed_id) {
        await admin.from("beds").update({ is_ready: true }).eq("id", task.bed_id);
      }
    } else if (action === "cancel") {
      update = { status: "cancelled" };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data, error } = await admin.from("housekeeping_tasks").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, task: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
