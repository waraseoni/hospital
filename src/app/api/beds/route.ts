import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ward_name, bed_number, bed_type, daily_rate } = await request.json();

    if (!ward_name || !bed_number || !bed_type || daily_rate === undefined) {
      return NextResponse.json({ error: "ward_name, bed_number, bed_type, and daily_rate are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data, error } = await admin.from("beds").insert({
      ward_name,
      bed_number,
      bed_type,
      daily_rate,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Bed created successfully", bed: data });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
