import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, contact_person = "", phone = "", email = "", address = "", gstin = "" } = await request.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.from("suppliers").insert({
      name, contact_person, phone, email, address, gstin,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, supplier: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("suppliers")
      .select("*")
      .order("name");

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ suppliers: data || [] });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
