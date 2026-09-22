import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = request.nextUrl.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("attendance")
      .select("*, staff:profiles(id, full_name, role)")
      .eq("work_date", date)
      .order("work_date", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ attendance: data || [] });
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
    const { staff_id, work_date, status, notes = "" } = body;
    if (!staff_id || !work_date || !status) {
      return NextResponse.json({ error: "staff_id, work_date, status required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("attendance")
      .upsert({
        staff_id,
        work_date,
        status,
        notes,
        marked_by: user.id,
        check_in: status === "present" || status === "late" ? new Date().toISOString() : null,
      }, { onConflict: "staff_id,work_date" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, attendance: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { staff_id, work_date, action } = await request.json();
    if (!staff_id || !work_date) return NextResponse.json({ error: "staff_id required" }, { status: 400 });

    const admin = createAdminClient();
    const update: Record<string, unknown> = {};
    if (action === "check_in") update.check_in = new Date().toISOString();
    if (action === "check_out") update.check_out = new Date().toISOString();

    const { data, error } = await admin
      .from("attendance")
      .upsert({ staff_id, work_date, ...update, marked_by: user.id }, { onConflict: "staff_id,work_date" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, attendance: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
