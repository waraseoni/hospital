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
      .from("leaves")
      .select("*, staff:profiles(id, full_name, role)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ leaves: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { staff_id, leave_type, from_date, to_date, reason } = await request.json();
    if (!staff_id || !from_date || !to_date) {
      return NextResponse.json({ error: "staff_id, from_date, to_date required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.from("leaves").insert({
      staff_id: staff_id || user.id,
      leave_type: leave_type || "casual",
      from_date,
      to_date,
      reason: reason || "",
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, leave: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
