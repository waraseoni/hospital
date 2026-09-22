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
      .from("rosters")
      .select("*, staff:profiles(id, full_name, role)")
      .eq("roster_date", date)
      .order("shift");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ rosters: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { staff_id, roster_date, shift = "general", department = "", notes = "" } = await request.json();
    if (!staff_id || !roster_date) {
      return NextResponse.json({ error: "staff_id, roster_date required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("rosters")
      .upsert({
        staff_id,
        roster_date,
        shift,
        department,
        notes,
        assigned_by: user.id,
      }, { onConflict: "staff_id,roster_date,shift" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, roster: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
