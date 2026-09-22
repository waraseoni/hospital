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
      .from("beds")
      .select("id, ward_name, bed_number, bed_type, is_occupied, is_ready")
      .order("ward_name")
      .order("bed_number");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ beds: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
